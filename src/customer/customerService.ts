import customerModel from "./customerModel";
import { CustomerModel } from "./customerType";

export class CustomerService {
  async getCustomer(userId: string) {
    return await customerModel.findOne({ userId });
  }

  async createCustomer(customer: CustomerModel) {
    return await customerModel.create(customer);
  }
}
