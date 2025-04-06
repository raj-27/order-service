import mongoose, { Schema } from "mongoose";
import { Order, OrderStatus, PaymentMode, PaymentStatus } from "./orderTypes";
import { CartItem, Topping } from "../types";

const ToppingSchema = new mongoose.Schema<Topping>({
  _id: {
    type: Schema.Types.ObjectId,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  price: {
    type: String,
    required: true,
  },
  image: {
    type: String,
    required: true,
  },
});

const cartSchema = new mongoose.Schema<CartItem>({
  name: String,
  image: String,
  qty: Number,
  priceConfiguration: {
    type: Map,
    of: {
      priceType: {
        type: String,
        enum: ["base", "aditional"],
        required: true,
      },
      availableOptions: {
        type: Map,
        of: Number,
        required: true,
      },
    },
  },
  chosenConfiguration: {
    priceConfiguration: {
      type: Map,
      of: String,
      required: true,
    },
    selectedToppings: [
      {
        type: [ToppingSchema],
        required: true,
      },
    ],
  },
});

const orderSchema = new mongoose.Schema<Order>(
  {
    cart: { type: [cartSchema], required: true },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "customer",
      required: true,
    },
    totalAmount: { type: Number, required: true },
    discount: { type: Number, required: true },
    taxes: { type: Number, required: true },
    deliveryCharges: { type: Number, required: true },
    address: { type: String, required: true },
    tenantId: { type: String, required: true },
    comment: { type: String, required: false, default: null },
    orderStatus: { type: String, enum: OrderStatus, required: true },
    paymentMode: { type: String, enum: PaymentMode, required: true },
    paymentStatus: { type: String, enum: PaymentStatus, required: true },
    paymentId: { type: String, required: false, default: null },
  },
  { timestamps: true },
);

export default mongoose.model("Order", orderSchema);
