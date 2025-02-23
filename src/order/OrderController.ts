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

export class OrderController {
  create = async (req: Request, res: Response) => {
    // todo : validate request data
    const totalPrice = await this.calculateTotal(req.body.cart);
    res.json({ totalPrice });
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
}
