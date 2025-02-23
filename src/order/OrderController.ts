import { Response } from "express";
import { Request } from "express-jwt";
import {
  CartItem,
  ProductPricingCache,
  Topping,
  ToppingPriceCache,
} from "../types";
import productCaheModel from "../productCache/productCaheModel";
import toppingCacheModel from "../toppingCache/toppingCacheModel";
import createHttpError from "http-errors";
import couponModel from "../coupon/couponModel";

export class OrderController {
  create = async (req: Request, res: Response) => {
    // todo : validate request data
    const totalPrice = await this.calculateTotal(req.body.cart);

    // Calculating discount
    let discountPercentage = 0;
    const couponCode = req.body.couponCode;
    const tenantId = req.body.tenantId;
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
    res.json({ taxes });
  };

  private calculateTotal = async (cart: CartItem[]) => {
    const productIds = cart.map((item) => item._id);
    // Todo : proper error handling
    const productPricings = await productCaheModel.find({
      productId: {
        $in: productIds,
      },
    });

    const cartToppingIds = cart.flatMap((item) =>
      item.chosenConfiguration.selectedToppings.map((topping) => topping.id),
    );

    // Todo : What will happen if topping does not exists in the cache
    const toppingPricings = await toppingCacheModel.find({
      toppingId: { $in: cartToppingIds },
    });
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
      (current) => topping.id === current.toppingId,
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
      const code = await couponModel.findOne({
        code: couponCode,
        tenantId: tenantId,
      });
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
