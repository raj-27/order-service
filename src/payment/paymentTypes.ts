export interface CustomMetadata {
  orderId: string;
}

export interface VerifiedSession {
  id: String;
  metadata: CustomMetadata;
  paymentStatus: GatewayPaymentStatus;
}

export interface PaymentOptions {
  currency?: "inr" | "usd" | "INR";
  amount: number;
  orderId: string;
  tenantId: string;
  idempotentKey?: string;
}
type GatewayPaymentStatus =
  | "no_payment_required"
  | "paid"
  | "unpaid"
  | "created"
  | "attempted"
  | "partially_paid"
  | "expired"
  | "cancelled";
export interface PaymentSession {
  id: string;
  paymentUrl?: string;
  paymentStatus?: GatewayPaymentStatus;
}
export interface PaymentFlow {
  createSession: (options: PaymentOptions) => Promise<PaymentSession>;
  getSession: (id: string) => Promise<VerifiedSession>;
}
