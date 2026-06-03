import mongoose from "mongoose";
import logger from "./logger";
import { Config } from ".";

const connectDB = async () => {
  try {
    logger.info(Config.DATABASE_URL);
    mongoose.connection.on("connected", () => {
      logger.info("Connected to database successfully");
    });

    mongoose.connection.on("error", (err) => {
      logger.error("Error in connecting to database.", err);
    });

    await mongoose.connect(Config.DATABASE_URL);
  } catch (err) {
    if (err instanceof Error) {
      logger.error("Error in connecting to database.", err);
    }
    process.exit(1);
  }
};

export default connectDB;
