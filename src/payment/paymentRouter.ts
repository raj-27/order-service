import express from "express";
import { asyncWrapper } from "../utils";
import { PaymentController } from "./paymentController";
import logger from "../config/logger";
import { createRazorpayGw } from "../common/factories/razorPayFactory";
import { createOrderService } from "../common/factories/orderServiceFactory";
import { createMessageBroker } from "../common/factories/brokerFactory";

const router = express.Router();
const paymentGw = createRazorpayGw();
const orderService = createOrderService();
const broker = createMessageBroker();
const paymentController = new PaymentController(
  paymentGw,
  orderService,
  broker,
  logger,
);

router.post("/webhook", asyncWrapper(paymentController.handleWebhook));

export default router;
