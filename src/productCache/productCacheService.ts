import mongoose from "mongoose";
import toppingCacheModel from "../toppingCache/toppingCacheModel";
import productCaheModel from "./productCaheModel";
import couponModel from "../coupon/couponModel";
import { Coupon } from "../coupon/couponType";

export class ProductCacheService {
  constructor() {}
  getProductPricing = async (productId: string[]) => {
    return await productCaheModel.find({ productId: { $in: productId } });
  };

  getToppingPricings = async (cartToppingIds: any) => {
    return await toppingCacheModel.find({
      toppingId: { $in: cartToppingIds },
    });
  };

  getCouponCode = async (
    couponCode: string,
    tenantId: string,
  ): Promise<Coupon | null> => {
    return await couponModel.findOne({ couponCode, tenantId });
  };
}
