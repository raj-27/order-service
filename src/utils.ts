import { NextFunction, Request, RequestHandler, Response } from "express";
import createHttpError from "http-errors";
import logger from "./config/logger";

export const asyncWrapper = (requestHandler: RequestHandler) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(requestHandler(req, res, next)).catch((err) => {
      if (err instanceof Error) {
        return next(createHttpError(500, err.message));
      }
      logger.warn(err);
      return next(createHttpError(500, "Internal server error"));
    });
  };
};
