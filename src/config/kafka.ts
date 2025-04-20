import {
  Consumer,
  EachMessagePayload,
  Kafka,
  KafkaConfig,
  Producer,
} from "kafkajs";
import { MessageBroker } from "../types/broker";
import { handleProductUpdate } from "../productCache/productUpdateHandler";
import { handleToppingUpdate } from "../toppingCache/toppingUpdateHandler";
import config from "config";
export class KafkaBroker implements MessageBroker {
  private cosumer: Consumer;
  private producer: Producer;

  constructor(clientId: string, brokers: string[]) {
    let kafkaConfig: KafkaConfig = {
      clientId,
      brokers,
    };

    if (process.env.NODE_ENV === "production") {
      kafkaConfig = {
        ...kafkaConfig,
        ssl: true,
        connectionTimeout: 45000,
        sasl: {
          mechanism: "plain",
          username: config.get("kafka.sasl.username"),
          password: config.get("kafka.sasl.password"),
        },
      };
    }

    const kafka = new Kafka(kafkaConfig);
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
  async sendMessage(topic: string, message: string, key: string) {
    const data: { value: string; key?: string } = {
      value: message,
    };
    if (key) {
      data.key = key;
    }
    await this.producer.send({ topic, messages: [data] });
  }

  /**
   * Consumming message
   */
  async consumeMessage(topics: string[], fromBeginning: boolean = false) {
    await this.cosumer.subscribe({ topics, fromBeginning });
    await this.cosumer.run({
      eachMessage: async ({
        topic,
        // partition,
        message,
      }: EachMessagePayload) => {
        switch (topic) {
          case "product":
            await handleProductUpdate(message.value.toString());
            break;
          case "topping":
            await handleToppingUpdate(message.value.toString());
            break;
          default:
            console.log("Doing Nothing");
            break;
        }
      },
    });
  }
}
