import { Response } from "express";
import { Request } from "express-jwt";
import { CouponService } from "./couponService";
import { Coupon } from "./couponType";
import { Roles } from "../constant";
import { AuthRequest } from "../types";
import { Logger } from "winston";

export class CouponController {
  constructor(
    private couponService: CouponService,
    private logger: Logger,
  ) {}

  createCuopon = async (req: Request, res: Response) => {
    const { title, code, discount, validUpto, tenantId } = req.body as Coupon;
    const { tenant, role } = req.auth;

    if (role !== Roles.ADMIN && tenant !== tenantId) {
      throw new Error("You are allowed to perform this action");
    }
    const existingCoupon = await this.couponService.getCoupon(code);
    if (existingCoupon) {
      throw new Error(`Coupon code ${code} already exist`);
    }
    const Coupon = await this.couponService.createCoupon({
      title,
      code,
      discount,
      validUpto,
      tenantId,
    });
    res.json(Coupon);
  };

  getCoupons = async (req: Request, res: Response) => {
    const coupons = await this.couponService.getCoupons({});
    return res.json(coupons);
  };

  updateCoupon = async (req: Request, res: Response) => {
    const { id } = req.params;

    const existingCoupon = await this.couponService.getCouponById(id);
    if (!existingCoupon) {
      throw new Error("Coupon not found.");
    }

    if ((req as AuthRequest).auth.role !== Roles.ADMIN) {
      const _tenantId = (req as AuthRequest).auth.tenant;
      if (existingCoupon.tenantId !== _tenantId) {
        throw new Error("You're are not allowed to do this action.");
      }
    }

    const coupon = req.body as Coupon;
    const updatedCoupon = await this.couponService.updateCoupon(id, coupon);
    this.logger.info("Product updated successfully");
    res.json(updatedCoupon);
  };

  deleteCoupon = async (req: Request, res: Response) => {
    // 1st get id of the coupon
    const { id } = req.params;
    // with id check that particular coupon exist?
    const coupon = await this.couponService.getCouponById(id);
    if (!coupon) {
      throw new Error("Coupon not found");
    }

    if ((req as AuthRequest).auth.role != Roles.ADMIN) {
      const _tenantId = (req as AuthRequest).auth.tenant;
      if (coupon.tenantId !== _tenantId) {
        throw new Error("You are not allowed to perform this action.");
      }
    }
    // if exist then delete it
    await this.couponService.deleteCoupon(id);
    this.logger.info("Coupon deleted successfully");
    // return json response
    return res.json({ message: "Coupon deleted successfully" });
  };
}
