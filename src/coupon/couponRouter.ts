import express from "express";
import { CouponController } from "./couponController";
import authenticate from "../common/middleware/authenticate";
import { asyncWrapper } from "../utils";
import { canAccess } from "../common/middleware/canAccess";
import { Roles } from "../constant";
import { CouponService } from "./couponService";
import logger from "../config/logger";

const router = express.Router();

const couponService = new CouponService();
const couponControler = new CouponController(couponService, logger);

router.post(
  "/",
  authenticate,
  canAccess([Roles.ADMIN, Roles.MANAGER]),
  asyncWrapper(couponControler.createCuopon),
);

router.get(
  "/",
  authenticate,
  canAccess([Roles.ADMIN, Roles.MANAGER]),
  asyncWrapper(couponControler.getCoupons),
);

router.put(
  "/:id",
  authenticate,
  canAccess([Roles.ADMIN, Roles.MANAGER]),
  asyncWrapper(couponControler.updateCoupon),
);

router.delete(
  "/:id",
  authenticate,
  canAccess([Roles.ADMIN, Roles.MANAGER]),
  asyncWrapper(couponControler.deleteCoupon),
);

export default router;
