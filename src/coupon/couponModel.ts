import mongoose from "mongoose";
import { Coupon } from "./couponType";

const couponSchema = new mongoose.Schema<Coupon>(
  {
    title: {
      type: String,
      required: true,
    },
    code: {
      type: String,
      required: true,
    },
    discount: {
      type: Number,
      required: true,
    },
    validUpto: {
      type: Date,
      require: true,
    },
    tenantId: {
      type: Number,
      required: true,
    },
  },
  { timestamps: true },
);

export default mongoose.model("coupon", couponSchema);
