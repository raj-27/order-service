import { NextFunction, Request, Response } from "express";
import { Logger } from "winston";
import { PaymentFlow } from "./paymentTypes";
import { OrderService } from "../order/orderService";
import { MessageBroker } from "../types/broker";
import { OrderEvents } from "../order/orderTypes";

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
    const updatedOrder = await this.orderService.updatePayment(
      verifiedSession.metadata.orderId,
      isPaymentSuccess,
    );
    const brokerMessage = {
      event_type: OrderEvents.PAYMENT_STATUS_UPDATE,
      data: updatedOrder,
    };
    await this.broker.sendMessage(
      "order",
      JSON.stringify(brokerMessage),
      updatedOrder._id.toString(),
    );
    return res.json({ success: true });
  };
}
