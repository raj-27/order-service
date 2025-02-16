import couponModel from "./couponModel";
import { Coupon } from "./couponType";

export class CouponService {
  createCoupon = async (coupon: Coupon) => {
    return await couponModel.create(coupon);
  };

  getCoupon = async (code: string) => {
    return await couponModel.findOne({ code: code });
  };

  getCoupons = async (filter) => {
    return await couponModel.find();
  };

  getCouponById = async (id: string) => {
    return await couponModel.findOne({ _id: id });
  };

  updateCoupon = async (id: string, coupon: Coupon) => {
    return await couponModel.findOneAndUpdate(
      { _id: id },
      { $set: coupon },
      { new: true },
    );
  };

  getCouponByCodeAndTenant = async (code: string, tenantId: string) => {
    return await couponModel.findOne({ code: code, tenantId: tenantId });
  };

  deleteCoupon = async (id: string) => {
    await couponModel.findOneAndDelete({ _id: id });
  };
}
