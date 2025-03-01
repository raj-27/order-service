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
import { Order, OrderStatus, PaymentStatus } from "./orderTypes";
import { IdempotencyServic } from "../idempotency/idempotencyService";
import mongoose from "mongoose";
import config from "config";

export class OrderController {
  constructor(
    private ProductCacheService: ProductCacheService,
    private OrderService: OrderService,
    private IdempotencyService: IdempotencyServic,
    private logger: Logger,
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
    console.log("cart", cart[0].chosenConfiguration.selectedToppings[0]._id);
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
    }

    // Payment Processing

    res.json({ newOrder });
  };

  private calculateTotal = async (cart: CartItem[]) => {
    const productIds = cart.map((item) => item._id);
    // Todo : proper error handling
    const productPricings =
      await this.ProductCacheService.getProductPricing(productIds);

    let cartToppingIds;
    try {
      cartToppingIds = cart.reduce((acc, item) => {
        console.log({ acc, item });
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

    console.log({ cartToppingIds });
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

    console.log(item.chosenConfiguration.priceConfiguration);

    const productTotal = Object.entries(
      item.chosenConfiguration.priceConfiguration,
    ).reduce((acc, [key, value]) => {
      try {
        console.log(cachedProductPrice.priceConfiguration[key]);
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
