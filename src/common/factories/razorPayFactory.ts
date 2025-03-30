import { RazorPayGateway } from "../../payment/razorpay";

let razorPay: RazorPayGateway | null = null;

export const createRazorpayGw = (): RazorPayGateway => {
  if (!razorPay) {
    razorPay = new RazorPayGateway();
  }
  return razorPay;
};
