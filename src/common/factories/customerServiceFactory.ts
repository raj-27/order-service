import { CustomerService } from "../../customer/customerService";

let customerService: CustomerService | null = null;

export const createCustomerService = (): CustomerService => {
  if (!customerService) {
    customerService = new CustomerService();
  }
  return customerService;
};
