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

  getOrderByCustomerId = async (customerId: mongoose.Types.ObjectId) => {
    return await orderModel.find(
      { customerId },
      {
        _id: 1,
        paymentStatus: 1,
        paymentMode: 1,
        createdAt: 1,
        orderStatus: 1,
        totalAmount: 1,
      },
    );
  };

  getOrderById = async (orderId: string, projectionFields: string[]) => {
    // return await orderModel.findById(orderId).populate("customerId");
    const projection = projectionFields.reduce(
      (acc, field) => {
        acc[field] = 1;
        return acc;
      },
      { customerId: 1 },
    );
    return await orderModel.findOne({ _id: orderId }, projection);
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
