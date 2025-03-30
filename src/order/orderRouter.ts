import express from "express";
import authenticate from "../common/middleware/authenticate";
import { asyncWrapper } from "../utils";
import { OrderController } from "./OrderController";
import { ProductCacheService } from "../productCache/productCacheService";
import logger from "../config/logger";
import { IdempotencyServic } from "../idempotency/idempotencyService";
import { createRazorpayGw } from "../common/factories/razorPayFactory";
import { createOrderService } from "../common/factories/orderServiceFactory";
import { createCustomerService } from "../common/factories/customerServiceFactory";
import { createMessageBroker } from "../common/factories/brokerFactory";
const router = express.Router();

const orderService = createOrderService();
const paymentGateway = createRazorpayGw();
const productCacheService = new ProductCacheService();
const idempotencyService = new IdempotencyServic();
const customerService = createCustomerService();
const broker = createMessageBroker();
const orderController = new OrderController(
  productCacheService,
  orderService,
  idempotencyService,
  logger,
  paymentGateway,
  customerService,
  broker,
);

router.post("/", authenticate, asyncWrapper(orderController.create));

export default router;
