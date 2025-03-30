import express from "express";
import { asyncWrapper } from "../utils";
import { CustomerController } from "./customerController";
import authenticate from "../common/middleware/authenticate";
import logger from "../config/logger";
import { createCustomerService } from "../common/factories/customerServiceFactory";
const router = express.Router();

const customerService = createCustomerService();
const customerController = new CustomerController(customerService, logger);

router.get("/", authenticate, asyncWrapper(customerController.getCustomer));

router.patch(
  "/addresses/:id",
  authenticate,
  asyncWrapper(customerController.addAddress),
);

export default router;
