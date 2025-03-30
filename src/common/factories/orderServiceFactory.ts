import { OrderService } from "../../order/orderService";

let orderService: OrderService | null = null;

export const createOrderService = (): OrderService => {
  if (!orderService) {
    orderService = new OrderService();
  }
  return orderService;
};
