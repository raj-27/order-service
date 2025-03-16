import customerModel from "./customerModel";
import { CustomerModel } from "./customerType";

export class CustomerService {
  async getCustomer(userId: string) {
    return await customerModel.findOne({ userId });
  }

  async getCustomerById(id: string) {
    return await customerModel.findById(id);
  }

  async createCustomer(customer: CustomerModel) {
    return await customerModel.create(customer);
  }

  async addAddress(id: string, userId: string, address: string) {
    // return await customerModel.updateOne({ userId: "123" },
    return await customerModel.findOneAndUpdate(
      {
        _id: id,
        userId,
      },
      {
        $push: {
          addresses: {
            text: address,
            // todo : implement isDefault field in future
            default: false,
          },
        },
      },
      { new: true },
    );
  }
}
