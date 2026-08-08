import {
  createMessagingClient,
  type MessagingClient,
} from '@ecommerce/messaging';
import { handleOrderConfirmed } from '../handlers/orderConfirmed';

const ORDER_CONFIRMED_QUEUE = 'cart.order-confirmed';

let client: MessagingClient | null = null;

export async function initMessaging(): Promise<MessagingClient> {
  if (!client) {
    client = await createMessagingClient();

    await client.subscribe(
      'order.confirmed',
      ORDER_CONFIRMED_QUEUE,
      async (payload) => {
        await handleOrderConfirmed(payload);
      },
    );
  }

  return client;
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
