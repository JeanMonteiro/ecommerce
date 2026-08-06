import {
  createMessagingClient,
  type MessagingClient,
} from '@ecommerce/messaging';
import { handleStockEvent } from '../handlers/stockEvents';

const STOCK_EVENTS_QUEUE = 'orders.stock-events';

let client: MessagingClient | null = null;

export async function initMessaging(): Promise<MessagingClient> {
  if (!client) {
    client = await createMessagingClient();
    await client.subscribe('stock.*', STOCK_EVENTS_QUEUE, async (payload) => {
      await handleStockEvent(payload);
    });
  }

  return client;
}

export async function getMessagingClient(): Promise<MessagingClient> {
  if (!client) {
    return initMessaging();
  }

  return client;
}

export async function publishEvent(
  routingKey: string,
  payload: unknown,
): Promise<void> {
  const messaging = await getMessagingClient();
  await messaging.publish(routingKey, payload);
}

export async function closeMessaging(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
  }
}

export function resetMessagingClientForTests(): void {
  client = null;
}
