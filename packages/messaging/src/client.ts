import amqp, { Channel, ChannelModel } from 'amqplib';
import {
  DEFAULT_EXCHANGE,
  DEFAULT_RABBITMQ_URL,
  EXCHANGE_TYPE,
} from './constants';

export interface PublishOptions {
  persistent?: boolean;
}

export type MessageHandler = (
  payload: unknown,
  raw: Buffer
) => void | Promise<void>;

export interface MessagingClientOptions {
  url?: string;
  exchange?: string;
}

export interface MessagingClient {
  publish(
    routingKey: string,
    payload: unknown,
    options?: PublishOptions
  ): Promise<void>;
  subscribe(
    routingKeyPattern: string,
    queueName: string,
    handler: MessageHandler
  ): Promise<void>;
  close(): Promise<void>;
}

export async function createMessagingClient(
  options: MessagingClientOptions = {}
): Promise<MessagingClient> {
  const url = options.url ?? process.env.RABBITMQ_URL ?? DEFAULT_RABBITMQ_URL;
  const exchange = options.exchange ?? DEFAULT_EXCHANGE;

  const connection: ChannelModel = await amqp.connect(url);
  const channel: Channel = await connection.createChannel();

  await channel.assertExchange(exchange, EXCHANGE_TYPE, { durable: true });

  return {
    async publish(routingKey, payload, publishOptions = {}) {
      const buffer = Buffer.from(JSON.stringify(payload));
      const published = channel.publish(exchange, routingKey, buffer, {
        persistent: publishOptions.persistent ?? true,
        contentType: 'application/json',
      });

      if (!published) {
        throw new Error(`Failed to publish message to ${routingKey}`);
      }
    },

    async subscribe(routingKeyPattern, queueName, handler) {
      await channel.assertQueue(queueName, { durable: true });
      await channel.bindQueue(queueName, exchange, routingKeyPattern);

      await channel.consume(queueName, async (message) => {
        if (!message) {
          return;
        }

        try {
          const payload = JSON.parse(message.content.toString()) as unknown;
          await handler(payload, message.content);
          channel.ack(message);
        } catch (error) {
          console.error('Message handler failed:', error);
          channel.nack(message, false, false);
        }
      });
    },

    async close() {
      await channel.close();
      await connection.close();
    },
  };
}
