import { config } from "dotenv";
import path from "path";

config({
  path: path.join(__dirname, `../../.env.${process.env.NODE_ENV ?? "dev"}`),
});

const {
  PORT,
  CLIENT_URL,
  ADMIN_URL,
  API_GATEWAY_URL,
  JWKS_URI,
  DATABASE_URL,
  KAFKA_SASL_USERNAME,
  KAFKA_SASL_PASSWORD,
  KAFKA_ORDER_TOPIC,
  KAFKA_TOPICS,
  KAFKA_BROKERS,
  RAZORPAY_KEY_ID,
  RAZORPAY_KEY_SECRET,
  STRIPE_SECRET_KEY,
} = process.env;

export const Config = Object.freeze({
  PORT,
  CLIENT_URL,
  ADMIN_URL,
  API_GATEWAY_URL,
  JWKS_URI,
  DATABASE_URL,
  KAFKA_SASL_USERNAME,
  KAFKA_SASL_PASSWORD,
  KAFKA_ORDER_TOPIC,
  KAFKA_TOPICS: KAFKA_TOPICS ? KAFKA_TOPICS.split(",") : [],
  KAFKA_BROKERS: KAFKA_BROKERS ? KAFKA_BROKERS.split(",") : [],
  RAZORPAY_KEY_ID,
  RAZORPAY_KEY_SECRET,
  STRIPE_SECRET_KEY,
});
