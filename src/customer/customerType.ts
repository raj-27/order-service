export interface Address {
  text: string;
  isDefault: boolean;
}

export interface CustomerModel {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  // tenantId: string;
  addresses: Address[];
}

export interface Customer extends CustomerModel {
  createdAt: Date;
  updatedAt: Date;
}
