import mongoose from "mongoose";
import { ProductPricingCache } from "../types";

const PriceSchema = new mongoose.Schema({
  priceType: {
    type: String,
    enum: ["base", "aditional"],
  },
  availableOptions: {
    type: Map,
    of: Number,
  },
});

const productCacheSchema = new mongoose.Schema<ProductPricingCache>({
  productId: {
    type: String,
    require: true,
  },
  priceConfiguration: {
    type: Object,
    of: PriceSchema,
  },
});

export default mongoose.model(
  "ProductPricingCache",
  productCacheSchema,
  "productCahe",
);
