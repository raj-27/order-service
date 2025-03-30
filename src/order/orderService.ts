import mongoose from "mongoose";
import orderModel from "./orderModel";
import { Order, PaymentStatus } from "./orderTypes";

export class OrderService {
  createOrder = async (
    newOrder: Order,
    session: mongoose.mongo.ClientSession,
  ) => {
    return await orderModel.create([newOrder], { session });
  };

  updateOrder = async (orderId: string, isPaymentSuccess: boolean) => {
    return await orderModel.findOneAndUpdate(
      { _id: orderId },
      {
        paymentStatus: isPaymentSuccess
          ? PaymentStatus.PAID
          : PaymentStatus.FAILED,
      },
      { new: true },
    );
  };
}
