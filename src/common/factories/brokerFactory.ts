import { KafkaBroker } from "../../config/kafka";
import { MessageBroker } from "../../types/broker";
import { Config } from "../../config";

let broker: MessageBroker | null = null;

export const createMessageBroker = (): MessageBroker => {
  // Singelton
  if (!broker) {
    broker = new KafkaBroker("order-service", Config.KAFKA_BROKERS);
  }
  return broker;
};
