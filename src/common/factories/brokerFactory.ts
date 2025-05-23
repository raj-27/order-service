import config from "config";
import { KafkaBroker } from "../../config/kafka";
import { MessageBroker } from "../../types/broker";

let broker: MessageBroker | null = null;

export const createMessageBroker = (): MessageBroker => {
  console.log("connecting kafka server.....");
  // Singelton
  if (!broker) {
    broker = new KafkaBroker(
      "order-service",
      config.get<string[]>("kafka.broker"),
    );
  }
  return broker;
};
