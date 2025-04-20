import mongoose from "mongoose";
import idempotencyModel from "./idempotencyModel";

export class IdempotencyServic {
  getIdempotency = async (idempotencyKey: string | string[]) => {
    return await idempotencyModel.findOne({ key: idempotencyKey });
  };

  createIdempotency = async (
    idempontencyObject: { key: string | string[]; response: object },
    session: mongoose.mongo.ClientSession,
  ) => {
    return await idempotencyModel.create([idempontencyObject], { session });
  };
}
