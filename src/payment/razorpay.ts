import {
  PaymentFlow,
  PaymentOptions,
  PaymentSession,
  VerifiedSession,
} from "./paymentTypes";
import Razorpay from "razorpay";
import config from "config";
import { ApplicationConstant } from "../constant";

export class RazorPayGateway implements PaymentFlow {
  private razorpay: Razorpay;

  constructor() {
    this.razorpay = new Razorpay({
      key_id: config.get("razorpay.key_id"),
      key_secret: config.get("razorpay.key_secret"),
    });
  }

  async createSession(options: PaymentOptions): Promise<PaymentSession> {
    try {
      const Options = {
        amount: options.amount * 100,
        currency: options.currency,
        accept_partial: false,
        description: ApplicationConstant.PizzaDeliveryPaymentDescription,
        // Todo : Capture structure address from customer
        customer: {
          name: options.customerName,
          email: options.customerEmail,
        },
        notify: {
          sms: false,
          email: false,
        },
        reminder_enable: true,
        notes: {
          orderId: options.orderId,
          tenantId: options.tenantId,
          idempotencyKey: options.idempotentKey,
          customerId: options.customerId,
        },
        callback_url: `${config.get("client.url")}/payment?success=true&orderId=${options.orderId}&restaurantId=${options.tenantId}`,
        callback_method: "get",
      };
      const session = await this.razorpay.paymentLink.create(Options);
      return {
        id: session.id,
        paymentStatus: session.status,
        paymentUrl: session.short_url,
      };
    } catch (error) {
      if (error instanceof Error) {
        throw error.message;
      }
      throw error;
    }
  }

  async getSession(id: string): Promise<VerifiedSession> {
    const order = await this.razorpay.orders.fetch(id);
    return {
      id: order.id,
      paymentStatus: order.status,
      metadata: {
        orderId: order.id,
        ...order.notes,
      },
    };
  }
}
