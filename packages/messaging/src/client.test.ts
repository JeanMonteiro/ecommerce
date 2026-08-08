import amqp from 'amqplib';
import {
  DEFAULT_EXCHANGE,
  DEFAULT_RABBITMQ_URL,
  EXCHANGE_TYPE,
} from './constants';
import { createMessagingClient } from './client';

jest.mock('amqplib', () => ({
  __esModule: true,
  default: {
    connect: jest.fn(),
  },
}));

const mockedConnect = amqp.connect as jest.Mock;

function createMockChannel() {
  return {
    assertExchange: jest.fn().mockResolvedValue(undefined),
    assertQueue: jest.fn().mockResolvedValue(undefined),
    bindQueue: jest.fn().mockResolvedValue(undefined),
    publish: jest.fn().mockReturnValue(true),
    consume: jest.fn().mockResolvedValue(undefined),
    ack: jest.fn(),
    nack: jest.fn(),
    close: jest.fn().mockResolvedValue(undefined),
  };
}

function createMockConnection(channel: ReturnType<typeof createMockChannel>) {
  return {
    createChannel: jest.fn().mockResolvedValue(channel),
    close: jest.fn().mockResolvedValue(undefined),
  };
}

describe('createMessagingClient', () => {
  let channel: ReturnType<typeof createMockChannel>;
  let connection: ReturnType<typeof createMockConnection>;

  beforeEach(() => {
    jest.clearAllMocks();
    channel = createMockChannel();
    connection = createMockConnection(channel);
    mockedConnect.mockResolvedValue(connection);
  });

  it('connects and asserts the topic exchange', async () => {
    await createMessagingClient({
      url: 'amqp://test:test@rabbit:5672',
      exchange: 'custom.events',
    });

    expect(mockedConnect).toHaveBeenCalledWith('amqp://test:test@rabbit:5672');
    expect(connection.createChannel).toHaveBeenCalled();
    expect(channel.assertExchange).toHaveBeenCalledWith(
      'custom.events',
      EXCHANGE_TYPE,
      { durable: true }
    );
  });

  it('uses defaults when options and env are not set', async () => {
    delete process.env.RABBITMQ_URL;

    await createMessagingClient();

    expect(mockedConnect).toHaveBeenCalledWith(DEFAULT_RABBITMQ_URL);
    expect(channel.assertExchange).toHaveBeenCalledWith(
      DEFAULT_EXCHANGE,
      EXCHANGE_TYPE,
      { durable: true }
    );
  });

  it('publish sends a JSON buffer with routing key and persistent flag', async () => {
    const client = await createMessagingClient({ exchange: DEFAULT_EXCHANGE });
    const payload = { orderId: 'ord-1', total: 99.5 };

    await client.publish('order.created', payload);

    expect(channel.publish).toHaveBeenCalledWith(
      DEFAULT_EXCHANGE,
      'order.created',
      Buffer.from(JSON.stringify(payload)),
      {
        persistent: true,
        contentType: 'application/json',
      }
    );
  });

  it('publish throws when channel.publish returns false', async () => {
    channel.publish.mockReturnValue(false);
    const client = await createMessagingClient();

    await expect(client.publish('order.created', {})).rejects.toThrow(
      'Failed to publish message to order.created'
    );
  });

  it('subscribe binds queue and acks on successful handler', async () => {
    const client = await createMessagingClient({ exchange: DEFAULT_EXCHANGE });
    const handler = jest.fn().mockResolvedValue(undefined);
    const payload = { userId: 42 };

    await client.subscribe('user.*', 'notifications.user-events', handler);

    expect(channel.assertQueue).toHaveBeenCalledWith(
      'notifications.user-events',
      { durable: true }
    );
    expect(channel.bindQueue).toHaveBeenCalledWith(
      'notifications.user-events',
      DEFAULT_EXCHANGE,
      'user.*'
    );
    expect(channel.consume).toHaveBeenCalledWith(
      'notifications.user-events',
      expect.any(Function)
    );

    const consumeCallback = channel.consume.mock.calls[0][1] as (
      message: { content: Buffer } | null
    ) => Promise<void>;
    const raw = Buffer.from(JSON.stringify(payload));

    await consumeCallback({ content: raw });

    expect(handler).toHaveBeenCalledWith(payload, raw);
    expect(channel.ack).toHaveBeenCalledWith({ content: raw });
    expect(channel.nack).not.toHaveBeenCalled();
  });

  it('subscribe nacks without requeue when handler fails', async () => {
    const client = await createMessagingClient();
    const handler = jest.fn().mockRejectedValue(new Error('handler failed'));
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    await client.subscribe('order.*', 'orders.events', handler);

    const consumeCallback = channel.consume.mock.calls[0][1] as (
      message: { content: Buffer } | null
    ) => Promise<void>;
    const message = { content: Buffer.from(JSON.stringify({ orderId: 'x' })) };

    await consumeCallback(message);

    expect(handler).toHaveBeenCalled();
    expect(channel.nack).toHaveBeenCalledWith(message, false, false);
    expect(channel.ack).not.toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it('subscribe ignores null messages', async () => {
    const client = await createMessagingClient();
    const handler = jest.fn();

    await client.subscribe('order.*', 'orders.events', handler);

    const consumeCallback = channel.consume.mock.calls[0][1] as (
      message: { content: Buffer } | null
    ) => Promise<void>;

    await consumeCallback(null);

    expect(handler).not.toHaveBeenCalled();
    expect(channel.ack).not.toHaveBeenCalled();
    expect(channel.nack).not.toHaveBeenCalled();
  });

  it('close shuts down channel and connection', async () => {
    const client = await createMessagingClient();

    await client.close();

    expect(channel.close).toHaveBeenCalled();
    expect(connection.close).toHaveBeenCalled();
  });
});
