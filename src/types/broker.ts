export interface MessageBroker {
  connectConsumer: () => Promise<void>;
  disconnectConsumer: () => Promise<void>;
  consumeMessage: (topic: string[], fromBeginning: boolean) => Promise<void>;
}
