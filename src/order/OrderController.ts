import { Response } from "express";
import { Request } from "express-jwt";

export class OrderController {
  create = async (req: Request, res: Response) => {
    res.json({ msg: "order created" });
  };
}
