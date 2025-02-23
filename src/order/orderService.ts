import orderModel from "./orderModel";
import { Order } from "./orderTypes";

export class OrderService {
  createOrder = async (newOrder: Order): Promise<Order | null> => {
    console.log(newOrder);
    return await orderModel.create(newOrder);
  };
}
