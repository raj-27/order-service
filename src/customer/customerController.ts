import { Response } from "express";
import { Request } from "express-jwt";
import { CustomerService } from "./customerService";
import { Logger } from "winston";
import customerModel from "./customerModel";

export class CustomerController {
  constructor(
    private CustomerService: CustomerService,
    private Logger: Logger,
  ) {}

  getCustomer = async (req: Request, res: Response) => {
    // todo : add these fields to jwt in auth service
    const { sub: userId, firstName, lastName, email } = req.auth;

    console.log(req.auth);
    const customer = await this.CustomerService.getCustomer(userId);

    if (!customer) {
      const newCustomer = await this.CustomerService.createCustomer({
        userId,
        firstName,
        lastName,
        email,
        addresses: [],
      });
      // Todo : add logging
      this.Logger.info("Customer created");
      return res.json(newCustomer);
    }
    res.json(customer);
  };

  addAddress = async (req: Request, res: Response) => {
    const { sub: userId } = req.auth;
    const customer = await this.CustomerService.addAddress(
      req.params.id,
      userId,
      req.body.address,
    );
    this.Logger.info("Address Added Successfully");
    return res.json(customer);
  };
}
