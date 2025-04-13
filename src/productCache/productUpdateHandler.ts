import { ProductMessage } from "../types";
import productCaheModel from "./productCaheModel";

export const handleProductUpdate = async (value: string) => {
  try {
    const { data: product }: { data: ProductMessage } = JSON.parse(value);
    return await productCaheModel.updateOne(
      { productId: product.id },
      { $set: { priceConfiguration: product.priceConfiguration } },
      { upsert: true },
    );
  } catch (error) {
    console.error("Error updating product in cache:", error);
  }
};
