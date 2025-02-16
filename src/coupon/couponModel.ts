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

// create index for fast lookup
couponSchema.index({ tenantId: 1, code: 1 }, { unique: true });
export default mongoose.model("coupon", couponSchema);
