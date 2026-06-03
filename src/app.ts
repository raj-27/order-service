import express, { Request, Response } from "express";
import cors from "cors";
import { globalErrorHandler } from "./common/middleware/globalErrorHandler";
import cookieParser from "cookie-parser";
import customerRouter from "./customer/customerRouter";
import couponRouter from "./coupon/couponRouter";
import orderRouter from "./order/orderRouter";
import paymentRouter from "./payment/paymentRouter";
import { Config } from "./config";

const app = express();
app.use(cookieParser());
app.use(express.json());

const ALLOWED_DOMAINS = [
  Config.CLIENT_URL,
  Config.ADMIN_URL,
  Config.API_GATEWAY_URL,
];

app.use(
  cors({
    origin: ALLOWED_DOMAINS as string[],
    methods: ["GET", "POST", "DELETE", "PUT", "PATCH"],
    credentials: true,
  }),
);

app.get("/health", (req: Request, res: Response) => {
  res.json({ message: true });
});

app.use("/customer", customerRouter);
app.use("/coupons", couponRouter);
app.use("/orders", orderRouter);
app.use("/payments", paymentRouter);

app.use(globalErrorHandler);

export default app;
