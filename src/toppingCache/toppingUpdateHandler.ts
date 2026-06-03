import logger from "../config/logger";
import { ToppingPriceCache } from "../types";
import toppingCacheModel from "./toppingCacheModel";

export const handleToppingUpdate = async (value: string) => {
  try {
    const { data: topping }: { data: ToppingPriceCache } = JSON.parse(value);
    return await toppingCacheModel.updateOne(
      { toppingId: topping._id },
      {
        $set: {
          price: topping.price,
          tenantId: topping.tenantId,
        },
      },
      { upsert: true },
    );
  } catch (error) {
    logger.error(error.toString());
  }
};
