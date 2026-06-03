import mongoose from "mongoose";
import orderModel from "./orderModel";
import { Order, OrderStatus, PaymentStatus } from "./orderTypes";
import { paginationLabels } from "../config/paginate";
import { OrderFilter, PageinateQuery } from "../types";

export class OrderService {
  createOrder = async (
    newOrder: Order,
    session: mongoose.mongo.ClientSession,
  ) => {
    return await orderModel.create([newOrder], { session });
  };

  getOrderByCustomerId = async (
    customerId: mongoose.Types.ObjectId,
    paginationQuery: PageinateQuery,
  ) => {
    const aggregation = orderModel.aggregate([
      { $match: { customerId } },
      {
        $project: {
          _id: 1,
          paymentStatus: 1,
          paymentMode: 1,
          createdAt: 1,
          orderStatus: 1,
          totalAmount: 1,
        },
      },
    ]);
    const result = await orderModel.aggregatePaginate(aggregation, {
      ...paginationQuery,
      customLabels: paginationLabels,
    });
    return result;
  };

  getAllOrders = async (
    filter: OrderFilter,
    paginatedQuery: PageinateQuery,
  ) => {
    const pipeline = [
      { $match: filter },
      {
        $lookup: {
          from: "customers",
          localField: "customerId",
          foreignField: "_id",
          as: "customer",
        },
      },
      { $unwind: "$customer" },
    ];

    const result = await orderModel.aggregatePaginate(
      orderModel.aggregate(pipeline).sort({ createdAt: 1 }),
      {
        ...paginatedQuery,
        customLabels: paginationLabels,
      },
    );
    return result;

    // return await orderModel
    //   .find(filter)
    //   .sort({ createAt: -1 })
    //   .populate("customerId")
    //   .exec();
  };

  getOrderById = async (orderId: string, projectionFields?: string[]) => {
    // return await orderModel.findById(orderId).populate("customerId");
    const projection = projectionFields?.reduce(
      (acc, field) => {
        acc[field] = 1;
        return acc;
      },
      { customerId: 1 },
    );
    const result = await orderModel.aggregate([
      {
        $match: { _id: new mongoose.Types.ObjectId(orderId) },
      },
      {
        $lookup: {
          from: "customers",
          localField: "customerId",
          foreignField: "_id",
          as: "customer",
        },
      },
      {
        $unwind: "$customer",
      },
      {
        $project: {
          ...projection,
          "customer.firstName": 1,
          "customer.lastName": 1,
        },
      },
    ]);

    return result[0] || null;
  };

  updateOrderStatus = async (orderId: string, orderStaus: OrderStatus) => {
    return await orderModel.findOneAndUpdate(
      { _id: orderId },
      { orderStatus: orderStaus },
      { new: true },
    );
  };

  updatePayment = async (orderId: string, isPaymentSuccess: boolean) => {
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
