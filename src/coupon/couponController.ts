import { NextFunction, Response } from "express";
import { Request } from "express-jwt";
import { CouponService } from "./couponService";
import { Coupon } from "./couponType";
import { Roles } from "../constant";
import { AuthRequest } from "../types";
import { Logger } from "winston";
import createHttpError from "http-errors";

export class CouponController {
  constructor(
    private couponService: CouponService,
    private logger: Logger,
  ) {}

  createCuopon = async (req: Request, res: Response, next: NextFunction) => {
    const { title, code, discount, validUpto, tenantId } = req.body as Coupon;
    const { tenant, role } = req.auth;

    if (role !== Roles.ADMIN && tenant !== tenantId) {
      const error = createHttpError(
        403,
        "You are not authorised to perform this action",
      );
      return next(error);
    }
    const existingCoupon = await this.couponService.getCoupon(code);
    if (existingCoupon) {
      const error = createHttpError(403, "Coupon Already Exist");
      return next(error);
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

  verify = async (req: Request, res: Response, next: NextFunction) => {
    const { code, tenantId } = req.body;
    // Todo: request validation
    const coupon = await this.couponService.getCouponByCodeAndTenant(
      code,
      tenantId,
    );
    if (!coupon) {
      // const error = createHttpError(400, "Coupon does not exists");
      // return next(error);
      return res.json({
        valid: false,
        discount: 0,
      });
    }

    // Validate Expiry
    const currentDate = new Date();
    const couponDate = new Date(coupon.validUpto);

    if (couponDate >= currentDate) {
      return res.json({
        valid: true,
        discount: coupon.discount,
      });
    }
    return res.json({ valid: false, discount: 0 });
  };

  getCoupons = async (req: Request, res: Response) => {
    const coupons = await this.couponService.getCoupons({});
    return res.json(coupons);
  };

  updateCoupon = async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;

    const existingCoupon = await this.couponService.getCouponById(id);
    if (!existingCoupon) {
      const error = createHttpError(403, "Coupon not found");
      return next(error);
    }

    if ((req as AuthRequest).auth.role !== Roles.ADMIN) {
      const _tenantId = (req as AuthRequest).auth.tenant;
      if (existingCoupon.tenantId !== _tenantId) {
        return next(
          createHttpError(403, "You're are not allowed to do this action."),
        );
      }
    }

    const coupon = req.body as Coupon;
    const updatedCoupon = await this.couponService.updateCoupon(id, coupon);
    this.logger.info("Product updated successfully");
    res.json(updatedCoupon);
  };

  deleteCoupon = async (req: Request, res: Response, next: NextFunction) => {
    // 1st get id of the coupon
    const { id } = req.params;
    // with id check that particular coupon exist?
    const coupon = await this.couponService.getCouponById(id);
    if (!coupon) {
      throw new Error("Coupon not found");
    }

    if ((req as AuthRequest).auth.role !== Roles.ADMIN) {
      const _tenantId = (req as AuthRequest).auth.tenant;
      if (coupon.tenantId !== _tenantId) {
        return next(
          createHttpError(403, "You're are not allowed to do this action."),
        );
      }
    }
    // if exist then delete it
    await this.couponService.deleteCoupon(id);
    this.logger.info("Coupon deleted successfully");
    // return json response
    return res.json({ message: "Coupon deleted successfully" });
  };
}
