import express from "express";
import authenticate from "../common/middleware/authenticate";
import { asyncWrapper } from "../utils";
import { OrderController } from "./OrderController";
import { ProductCacheService } from "../productCache/productCacheService";
import logger from "../config/logger";
import { OrderService } from "./orderService";
const router = express.Router();

const productCacheService = new ProductCacheService();
const orderService = new OrderService();
const orderController = new OrderController(
  productCacheService,
  orderService,
  logger,
);

router.post("/", authenticate, asyncWrapper(orderController.create));

export default router;
