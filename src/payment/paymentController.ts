import { NextFunction, Request, Response } from "express";
import { Logger } from "winston";
import { PaymentFlow } from "./paymentTypes";
import { OrderService } from "../order/orderService";
import { MessageBroker } from "../types/broker";

export class PaymentController {
  constructor(
    private paymentGw: PaymentFlow,
    private orderService: OrderService,
    private broker: MessageBroker,
    private Logger: Logger,
  ) {}
  handleWebhook = async (req: Request, res: Response, next: NextFunction) => {
    const webHookBody = req.body;
    console.log(webHookBody);
    console.log(webHookBody?.payload?.payment?.entity);
    const { order_id } = webHookBody?.payload?.payment?.entity;
    const verifiedSession = await this.paymentGw.getSession(order_id);
    console.log("verified sessionf", verifiedSession);
    const isPaymentSuccess = verifiedSession.paymentStatus === "paid";
    const updatedOrder = await this.orderService.updateOrder(
      verifiedSession.metadata.orderId,
      isPaymentSuccess,
    );
    console.log(updatedOrder);
    // Todo Done: send update to kafka broker
    // Todo : Think about broker message failed.
    await this.broker.sendMessage("order", JSON.stringify(updatedOrder));
    return res.json({ success: true });
  };
}
