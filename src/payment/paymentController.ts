import { Request, Response } from "express";
import { Logger } from "winston";
import { PaymentFlow } from "./paymentTypes";
import { OrderService } from "../order/orderService";
import { MessageBroker } from "../types/broker";
import { OrderEvents } from "../order/orderTypes";
import { CustomerService } from "../customer/customerService";

export class PaymentController {
  constructor(
    private paymentGw: PaymentFlow,
    private orderService: OrderService,
    private customerService: CustomerService,
    private broker: MessageBroker,
    private Logger: Logger,
  ) {}
  handleWebhook = async (req: Request, res: Response) => {
    const webHookBody = req.body;
    const entity = webHookBody?.payload?.payment?.entity;
    const order_id = entity?.order_id;
    const verifiedSession = await this.paymentGw.getSession(order_id);
    const isPaymentSuccess = verifiedSession.paymentStatus === "paid";
    const updatedOrder = await this.orderService.updatePayment(
      verifiedSession.metadata.orderId,
      isPaymentSuccess,
    );
    const customer = await this.customerService.getCustomerByUserId(
      updatedOrder.customerId.toString(),
    );
    const brokerMessage = {
      event_type: OrderEvents.PAYMENT_STATUS_UPDATE,
      data: { ...updatedOrder.toObject(), customer },
    };
    console.log("Message in payment controller", brokerMessage);
    await this.broker.sendMessage(
      "order",
      JSON.stringify(brokerMessage),
      updatedOrder._id.toString(),
    );
    return res.json({ success: true });
  };
}
