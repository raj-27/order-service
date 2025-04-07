export interface MessageBroker {
  connectConsumer: () => Promise<void>;
  disconnectConsumer: () => Promise<void>;
  consumeMessage: (topic: string[], fromBeginning: boolean) => Promise<void>;

  connectProducer: () => Promise<void>;
  disconnectProducer: () => Promise<void>;
  sendMessage: (topic: string, message: string, key?: string) => Promise<void>;
}
