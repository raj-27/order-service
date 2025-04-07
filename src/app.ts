import express, { Request, Response } from "express";
import cors from "cors";
import { globalErrorHandler } from "./common/middleware/globalErrorHandler";
import cookieParser from "cookie-parser";
import customerRouter from "./customer/customerRouter";
import couponRouter from "./coupon/couponRouter";
import orderRouter from "./order/orderRouter";
import paymentRouter from "./payment/paymentRouter";

const app = express();
app.use(cookieParser());
app.use(express.json());

app.use(
  cors({
    origin: ["http://localhost:3000", "http://localhost:5173"],
    methods: ["GET", "POST", "DELETE", "PUT", "PATCH"],
    credentials: true,
  }),
);

app.get("/", (req: Request, res: Response) => {
  res.json({ message: "Hello from order service service!" });
});

app.use("/customer", customerRouter);
app.use("/coupons", couponRouter);
app.use("/orders", orderRouter);
app.use("/payments", paymentRouter);

app.use(globalErrorHandler);

export default app;
