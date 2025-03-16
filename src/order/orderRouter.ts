import express from "express";
import authenticate from "../common/middleware/authenticate";
import { asyncWrapper } from "../utils";
import { OrderController } from "./OrderController";
import { ProductCacheService } from "../productCache/productCacheService";
import logger from "../config/logger";
import { OrderService } from "./orderService";
import { IdempotencyServic } from "../idempotency/idempotencyService";
import { RazorPayGateway } from "../payment/razorpay";
import { CustomerService } from "../customer/customerService";
const router = express.Router();

const productCacheService = new ProductCacheService();
const orderService = new OrderService();
const idempotencyService = new IdempotencyServic();
const paymentGateway = new RazorPayGateway();
const customerService = new CustomerService();
const orderController = new OrderController(
  productCacheService,
  orderService,
  idempotencyService,
  logger,
  paymentGateway,
  customerService,
);

router.post("/", authenticate, asyncWrapper(orderController.create));

export default router;
