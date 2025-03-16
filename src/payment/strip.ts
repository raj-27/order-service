import { PaymentFlow, PaymentOptions } from "./paymentTypes";
import Stripe from "stripe";
import config from "config";
export class StripeGateway implements PaymentFlow {
  private stripe: Stripe;
  constructor() {
    this.stripe = new Stripe(config.get("stripe.secretKey"));
  }

  async createSession(options: PaymentOptions) {
    const session = await this.stripe.checkout.sessions.create(
      {
        metadata: {
          orderId: options.orderId,
        },
        line_items: [
          {
            price_data: {
              unit_amount: options.amount,
              product_data: {
                name: "Online Pizza Order",
                description: "Total Amount to be paid",
                images: ["https://placeholder.jp/150*150.png"],
              },
              currency: "usd",
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        // Todo : Make  sure to move url config
        success_url: `http://localhost:3000/payment?success=true&orderId=${options.orderId}`,
        cancel_url: `http://localhost:3000/payment?cancel=false&orderId=${options.orderId}`,
      },
      { idempotencyKey: options.idempotentKey },
    );
    return {
      id: session.id,
      paymentUrl: session.url,
      paymentStatus: session.payment_status,
    };
  }
  async getSession() {
    return null;
  }
}
