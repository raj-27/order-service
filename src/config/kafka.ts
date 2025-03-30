import { Consumer, EachMessagePayload, Kafka, Producer } from "kafkajs";
import { MessageBroker } from "../types/broker";
import { handleProductUpdate } from "../productCache/productUpdateHandler";
import { handleToppingUpdate } from "../toppingCache/toppingUpdateHandler";

export class KafkaBroker implements MessageBroker {
  private cosumer: Consumer;
  private producer: Producer;

  constructor(clientId: string, brokers: string[]) {
    const kafka = new Kafka({ clientId, brokers });
    this.producer = kafka.producer();
    this.cosumer = kafka.consumer({ groupId: clientId });
  }

  /**
   * Connect the consumer
   */
  async connectConsumer() {
    await this.cosumer.connect();
  }

  /**
   * Connect the produce
   */
  async connectProducer() {
    if (this.producer) {
      await this.producer.connect();
    }
  }

  /**
   * Disconnect the consumer
   */
  async disconnectConsumer() {
    await this.cosumer.disconnect();
  }

  /**
   * Disconnect the producer
   */
  async disconnectProducer() {
    if (this.producer) {
      await this.producer.disconnect();
    }
  }

  /**
   * @param topic - the topic to send the message to
   * @param message - the message to send
   * @throws {Error} - when the producer is not connected
   */
  async sendMessage(topic: string, message: string) {
    await this.producer.send({ topic, messages: [{ value: message }] });
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
          case "topping":
            await handleToppingUpdate(message.value.toString());
          default:
            console.log("Doing Nothing");
            break;
        }
        console.log({ value: message.value.toString(), topic, partition });
      },
    });
  }
}
