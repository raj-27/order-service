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
import { ProductCacheService } from "../productCache/productCacheService";
import { OrderService } from "./orderService";
import { OrderStatus, PaymentStatus } from "./orderTypes";
import { IdempotencyServic } from "../idempotency/idempotencyService";
import mongoose from "mongoose";
import { PaymentFlow } from "../payment/paymentTypes";
import { CustomerService } from "../customer/customerService";

export class OrderController {
  constructor(
    private ProductCacheService: ProductCacheService,
    private OrderService: OrderService,
    private IdempotencyService: IdempotencyServic,
    private logger: Logger,
    private PaymentGateWay: PaymentFlow,
    private CustomerService: CustomerService,
  ) {}
  create = async (req: Request, res: Response, next: NextFunction) => {
    // todo : validate request data
    const {
      cart,
      couponCode,
      tenantId,
      paymentMode,
      customerId,
      comment,
      address,
    } = req.body;
    const totalPrice = await this.calculateTotal(cart);

    // Calculating discount
    let discountPercentage = 0;
    if (couponCode) {
      discountPercentage = await this.getDiscountPercentage(
        couponCode,
        tenantId,
      );
    }
    const discountAmount = Math.round((totalPrice * discountPercentage) / 100);
    const priceAfterDiscount = totalPrice - discountAmount;
    // Todo : May be store in db for each tenant
    const TAX_PERCENT = 18;
    const taxes = Math.round(priceAfterDiscount * TAX_PERCENT) / 100;
    // Todo: maybe store in database for each tenant or maybe calculated according to buisness rule
    const DELIVERY_CHARGES = 50;
    const finalTotal = priceAfterDiscount + taxes + DELIVERY_CHARGES;
    const idempotencyKey = req.headers["idempotency-key"];
    const idempotency =
      await this.IdempotencyService.getIdempotency(idempotencyKey);
    let newOrder = idempotency ? [idempotency.response] : [];
    if (!idempotency) {
      const session = await mongoose.startSession();
      await session.startTransaction();
      try {
        newOrder = await this.OrderService.createOrder(
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
        await this.IdempotencyService.createIdempotency(
          { key: idempotencyKey, response: newOrder[0] },
          session,
        );
        await session.commitTransaction();
      } catch (error) {
        await session.abortTransaction();
        await session.endSession();
        return next(createHttpError(500, error.message));
      } finally {
        await session.endSession();
      }
    } else {
      return next(
        createHttpError(
          500,
          `Idempotency key is already present ${idempotencyKey}`,
        ),
      );
    }

    // Payment Processing
    const customerDetails =
      await this.CustomerService.getCustomerById(customerId);
    try {
      const session = await this.PaymentGateWay.createSession({
        amount: finalTotal,
        orderId: newOrder[0]._id.toString(),
        tenantId: tenantId,
        currency: "INR",
        idempotentKey: idempotencyKey as string,
        customerId: customerDetails.id,
        customerEmail: customerDetails.email,
        customerName: `${customerDetails.firstName} ${customerDetails.lastName}`,
      });
      this.logger.info(session);
      // Todo : Update order document => paymentID => sessionId
      res.json({ paymentUrl: session.paymentUrl });
    } catch (error) {
      if (error instanceof Error) {
        this.logger.warn(error.message);
        return next(
          createHttpError(
            500,
            `Error occur while making payment request: ${error.message}`,
          ),
        );
      }
    }
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
      console.log("Error", error);
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
