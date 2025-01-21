export type Coupon = {
  id?: string;
  title: string;
  code: string;
  discount: number;
  validUpto: Date;
  tenantId: number;
};
