import app from "./src/app";
import logger from "./src/config/logger";
import connectDB from "./src/config/db";
import { MessageBroker } from "./src/types/broker";
import { createMessageBroker } from "./src/common/factories/brokerFactory";
import { Config } from "./src/config";

const startServer = async () => {
  const PORT = Config.PORT || 5003;
  let broker: MessageBroker | null = null;

  try {
    logger.info("Connecting to DB...");
    await connectDB();
    logger.info("Database connected successfully");

    broker = createMessageBroker();

    logger.info("Connecting Kafka Producer...");
    await broker
      .connectProducer()
      .then(() => logger.info("Producer connected successfully"))
      .catch((err) => {
        logger.error("Producer connection failed:", err);
      });

    logger.info("Connecting Kafka Consumer...");
    await broker
      .connectConsumer()
      .then(() => logger.info("Consumer connected successfully"))
      .catch((err) => {
        logger.error("Consumer connection failed:", err);
      });
    logger.info(Config.KAFKA_TOPICS);
    logger.info("Subscribing to topics:", {
      topics: Config.KAFKA_TOPICS,
    });
    await broker
      .consumeMessage(Config.KAFKA_TOPICS, false)
      .then(() => logger.info("Kafka subscription successful"))
      .catch((err) => {
        logger.error("Kafka subscription failed:", err);
      });

    app
      .listen(PORT, () => logger.info(`Listening on port ${PORT}`))
      .on("error", (err) => {
        logger.error("Server error:", err.message);
        process.exit(1);
      });
  } catch (err) {
    logger.error("Startup failed:", err?.message || err);

    if (broker) {
      try {
        await broker.disconnectConsumer();
        await broker.disconnectProducer();
      } catch (cleanupErr) {
        logger.error("Cleanup failed:", cleanupErr);
      }
    }

    process.exit(1);
  }
};

void startServer();
