import { NextFunction, Response } from "express";
import { Request } from "express-jwt";
import {
  CartItem,
  ProductPricingCache,
  Topping,
  ToppingPriceCache,
} from "../types";
import createHttpError from "http-errors";
import { Logger } from "winston";
import mongoose from "mongoose";
import { ProductCacheService } from "../productCache/productCacheService";
import { OrderService } from "./orderService";
import {
  OrderEvents,
  OrderStatus,
  PaymentMode,
  PaymentStatus,
} from "./orderTypes";
import { IdempotencyServic } from "../idempotency/idempotencyService";
import { PaymentFlow } from "../payment/paymentTypes";
import { CustomerService } from "../customer/customerService";
import { MessageBroker } from "../types/broker";
import { Roles } from "../constant";
import { Config } from "../config";

export class OrderController {
  constructor(
    private ProductCacheService: ProductCacheService,
    private OrderService: OrderService,
    private IdempotencyService: IdempotencyServic,
    private logger: Logger,
    private PaymentGateWay: PaymentFlow,
    private CustomerService: CustomerService,
    private broker: MessageBroker,
  ) {}

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const {
        cart,
        couponCode,
        tenantId,
        paymentMode,
        customerId,
        comment,
        address,
      } = req.body;

      const idempotencyKey = req.headers["idempotency-key"] as string;

      if (!idempotencyKey) {
        return next(createHttpError(400, "Idempotency key is required"));
      }

      // 1️⃣ Check idempotency
      const existing =
        await this.IdempotencyService.getIdempotency(idempotencyKey);

      if (existing) {
        // return previous response (correct idempotency behavior)
        return res.json(existing.response);
      }

      // 2️⃣ Pricing Logic
      const totalPrice = await this.calculateTotal(cart);

      let discountPercentage = 0;
      if (couponCode) {
        discountPercentage = await this.getDiscountPercentage(
          couponCode,
          tenantId,
        );
      }

      const discountAmount = Math.round(
        (totalPrice * discountPercentage) / 100,
      );
      const priceAfterDiscount = totalPrice - discountAmount;

      const TAX_PERCENT = 18;
      const taxes = Math.round(priceAfterDiscount * TAX_PERCENT) / 100;

      const DELIVERY_CHARGES = 50;
      const finalTotal = priceAfterDiscount + taxes + DELIVERY_CHARGES;

      // 3️⃣ Start transaction
      const session = await mongoose.startSession();
      await session.startTransaction();

      let createdOrder;

      try {
        const orderDocs = await this.OrderService.createOrder(
          {
            cart,
            customerId,
            tenantId,
            address,
            deliveryCharges: DELIVERY_CHARGES,
            discount: discountAmount,
            taxes,
            totalAmount: finalTotal,
            paymentMode,
            orderStatus: OrderStatus.RECIEVED,
            paymentStatus: PaymentStatus.PENDING,
            comment,
          },
          session,
        );

        // 4️⃣ Convert to plain object (fix circular structure issue)
        createdOrder = orderDocs[0].toObject();

        // Store idempotency record
        await this.IdempotencyService.createIdempotency(
          { key: idempotencyKey, response: createdOrder },
          session,
        );

        await session.commitTransaction();
      } catch (err) {
        await session.abortTransaction();
        await session.endSession();
        throw err;
      } finally {
        await session.endSession();
      }

      // 5️⃣ Get customer
      const customerDetails =
        await this.CustomerService.getCustomerById(customerId);

      // Create Kafka safe message (no circular objects)
      const brokerMessage = {
        event_type: OrderEvents.ORDER_CREATE,
        data: { ...createdOrder, customer: customerDetails },
      };

      // 6️⃣ Payment Mode Flow
      if (paymentMode === PaymentMode.CARD) {
        const paymentSession = await this.PaymentGateWay.createSession({
          amount: finalTotal,
          orderId: createdOrder._id.toString(),
          tenantId,
          currency: "INR",
          idempotentKey: idempotencyKey,
          customerId: customerDetails.id,
          customerEmail: customerDetails.email,
          customerName: `${customerDetails.firstName} ${customerDetails.lastName}`,
        });

        // Publish Kafka event
        await this.broker.sendMessage(
          Config.KAFKA_ORDER_TOPIC,
          JSON.stringify(brokerMessage),
          createdOrder._id.toString(),
        );

        return res.json({ paymentUrl: paymentSession.paymentUrl });
      }

      // 7️⃣ COD Flow
      await this.broker.sendMessage(
        Config.KAFKA_ORDER_TOPIC,
        JSON.stringify(brokerMessage),
        createdOrder._id.toString(),
      );

      return res.json({ paymentUrl: null });
    } catch (error) {
      this.logger.warn(error.message);
      return next(
        createHttpError(
          500,
          `Something went wrong while creating order: ${error.message}`,
        ),
      );
    }
  };

  getAll = async (req: Request, res: Response, next: NextFunction) => {
    const { role, tenant: userTenantId } = req.auth;
    const tenantId = req.query.tenantId ?? userTenantId;
    const { page, limit } = req.query;
    if (role === Roles.CUSTOMER) {
      return next(createHttpError(403, "Not allowed"));
    }
    if (role === Roles.ADMIN) {
      const filter = {};
      if (tenantId) {
        filter["tenantId"] = tenantId;
      }
      // Todo : VERY IMPORTANT ADD PAGINATION
      const orders = await this.OrderService.getAllOrders(filter, {
        page: parseInt(page as string) || 1,
        limit: parseInt(limit as string) || 10,
      });
      return res.json(orders);
    }

    if (role === Roles.MANAGER) {
      const filter = { tenantId: tenantId.toString() };
      // Todo : VERY IMPORTANT ADD PAGINATION
      const orders = await this.OrderService.getAllOrders(filter, {
        page: parseInt(page as string) || 1,
        limit: parseInt(limit as string) || 10,
      });
      return res.json(orders);
    }
    return next(createHttpError(403, "Not Allowed"));
  };

  getMine = async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.auth.sub;
    const { page, limit } = req.query;
    if (!userId) {
      return next(createHttpError(400, "No user id found"));
    }
    const customer = await this.CustomerService.getCustomerByUserId(userId);
    if (!customer) {
      return next(createHttpError(400, "No customer"));
    }
    // Todo: Implement pagination for query cutomer order history
    const order = await this.OrderService.getOrderByCustomerId(customer._id, {
      page: parseInt(page as string) || 1,
      limit: parseInt(limit as string) || 10,
    });
    res.json(order);
  };

  getSingle = async (req: Request, res: Response, next: NextFunction) => {
    const { sub: userId, role, tenant: tenantId } = req.auth;
    const orderId = req.params.orderId;
    const projectionFields = req.query.fields
      ? req.query.fields.toString().split(",")
      : [];
    if (!userId) {
      return next(createHttpError(400, "No user id found"));
    }
    // Todo: Implement pagination for query cutomer order history
    const order = await this.OrderService.getOrderById(
      orderId,
      projectionFields,
    );

    // What roles can access this endpoint : Admin,manager(for their own restaurant),customer(own order)
    if (role === Roles.ADMIN) {
      return res.json(order);
    }
    const myRestaurantOrder = order.tenantId === tenantId?.toString();
    if (role === Roles.MANAGER && myRestaurantOrder) {
      return res.json(order);
    }
    if (role === Roles.CUSTOMER) {
      const customer = await this.CustomerService.getCustomerByUserId(userId);
      if (!customer) {
        return next(createHttpError(400, "No customer found"));
      }
      if (order.customerId._id.toString() === customer.id.toString()) {
        return res.json(order);
      }
    }
    return next(createHttpError(403, "Operation not permitted"));
  };

  changeStatus = async (req: Request, res: Response, next: NextFunction) => {
    const { role, tenant: tenantId } = req.auth;
    const orderId = req.params.orderId;
    const status = req.body.status;

    if (role === Roles.MANAGER || Roles.ADMIN) {
      const order = await this.OrderService.getOrderById(orderId);
      if (!order) {
        return next(createHttpError(400, "Order not found"));
      }
      const isMyRestaurantOrder = order.tenantId === tenantId;
      if (role === Roles.MANAGER && !isMyRestaurantOrder) {
        return next(createHttpError(403, "Operation not permitted"));
      }
      // Todo: status put proper validation
      const updatedOrder = await this.OrderService.updateOrderStatus(
        orderId,
        status,
      );
      const customer = await this.CustomerService.getCustomerByUserId(
        updatedOrder.customerId.toString(),
      );
      const brokerMessage = {
        event_type: OrderEvents.ORDER_STATUS_UPDATE,
        data: { ...updatedOrder.toObject(), customer },
      };
      await this.broker.sendMessage(
        "order",
        JSON.stringify(brokerMessage),
        updatedOrder._id.toString(),
      );
      return res.json({ _id: updatedOrder._id });
    }

    return next(createHttpError(403, "Not Allowed"));
  };

  private calculateTotal = async (cart: CartItem[]) => {
    const productIds = cart.map((item) => item._id);
    // Todo : proper error handling
    const productPricings =
      await this.ProductCacheService.getProductPricing(productIds);

    let cartToppingIds;
    try {
      cartToppingIds = cart.reduce((acc, item) => {
        return [
          ...acc,
          ...item.chosenConfiguration.selectedToppings.map(
            (topping) => topping._id, // 🔹 Fix: `_id` instead of `id`
          ),
        ];
      }, []);
    } catch (error) {
      this.logger.error(error);
    }

    // Todo : What will happen if topping does not exists in the cache
    const toppingPricings =
      await this.ProductCacheService.getToppingPricings(cartToppingIds);
    const totalPrice = cart.reduce((acc, curr) => {
      const cachedProductPrice = productPricings.find(
        (product) => product.productId === curr._id,
      );
      return (
        acc +
        curr.qty * this.getItemTotal(curr, cachedProductPrice, toppingPricings)
      );
    }, 0);
    return totalPrice;
  };

  private getItemTotal = (
    item: CartItem,
    cachedProductPrice: ProductPricingCache,
    toppingPricings: ToppingPriceCache[],
  ): number => {
    const toppingsTotal = item.chosenConfiguration.selectedToppings.reduce(
      (acc, curr) => {
        return acc + this.getCurrentToppingPrice(curr, toppingPricings);
      },
      0,
    );
    const productTotal = Object.entries(
      item.chosenConfiguration.priceConfiguration,
    ).reduce((acc, [key, value]) => {
      try {
        const price =
          cachedProductPrice.priceConfiguration[key].availableOptions[value];
        return acc + price;
      } catch (error) {
        if (error instanceof Error) {
          throw createHttpError(404, error.message);
        }
      }
    }, 0);
    return productTotal + toppingsTotal;
  };

  private getCurrentToppingPrice = (
    topping: Topping,
    toppingPricing: ToppingPriceCache[],
  ): number => {
    const currentTopping = toppingPricing.find(
      (current) => String(topping._id) === current.toppingId,
    );
    if (!currentTopping) {
      // Todo : Make sure the item is in the cache else, maybe call catalog service
      return +topping.price;
    }
    return currentTopping.price;
  };

  private getDiscountPercentage = async (
    couponCode: string,
    tenantId: string,
  ) => {
    try {
      const code = await this.ProductCacheService.getCouponCode(
        couponCode,
        tenantId,
      );
      if (!code) {
        return 0;
      }
      const currentDate = new Date();
      const couponDate = new Date(code.validUpto);
      if (currentDate <= couponDate) {
        return code.discount;
      }
      return 0;
    } catch (error) {
      return 0;
    }
  };
}
