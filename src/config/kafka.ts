import { Consumer, EachMessagePayload, Kafka } from "kafkajs";
import { MessageBroker } from "../types/broker";
import { handleProductUpdate } from "../productCache/productUpdateHandler";

export class KafkaBroker implements MessageBroker {
  private cosumer: Consumer;

  constructor(clientId: string, brokers: string[]) {
    const kafka = new Kafka({ clientId, brokers });
    this.cosumer = kafka.consumer({ groupId: clientId });
  }

  /**
   * Connect the consumer
   */
  async connectConsumer() {
    await this.cosumer.connect();
  }

  /**
   * Disconnect the consumer
   */
  async disconnectConsumer() {
    await this.cosumer.disconnect();
  }

  /**
   * Consumming message
   */
  async consumeMessage(topics: string[], fromBeginning: boolean = false) {
    await this.cosumer.subscribe({ topics, fromBeginning });
    await this.cosumer.run({
      eachMessage: async ({
        topic,
        partition,
        message,
      }: EachMessagePayload) => {
        // Logic to handle icoming message
        switch (topic) {
          case "product":
            await handleProductUpdate(message.value.toString());
            break;
          default:
            console.log("Doing Nothing");
            break;
        }
        console.log({ value: message.value.toString(), topic, partition });
      },
    });
  }
}
