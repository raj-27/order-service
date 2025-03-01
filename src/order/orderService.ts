import mongoose from "mongoose";
import orderModel from "./orderModel";
import { Order } from "./orderTypes";

export class OrderService {
  createOrder = async (
    newOrder: Order,
    session: mongoose.mongo.ClientSession,
  ) => {
    return await orderModel.create([newOrder], { session });
  };
}
