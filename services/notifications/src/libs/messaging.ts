import {
  createMessagingClient,
  type MessagingClient,
} from '@ecommerce/messaging';
import { handleUserRegistered } from '../handlers/userRegistered';
import { handleOrderConfirmed } from '../handlers/orderConfirmed';
import { handleOrderCancelled } from '../handlers/orderCancelled';

const USER_REGISTERED_QUEUE = 'notifications.user-registered';
const ORDER_CONFIRMED_QUEUE = 'notifications.order-confirmed';
const ORDER_CANCELLED_QUEUE = 'notifications.order-cancelled';

let client: MessagingClient | null = null;

export async function initMessaging(): Promise<MessagingClient> {
  if (!client) {
    client = await createMessagingClient();

    await client.subscribe(
      'user.registered',
      USER_REGISTERED_QUEUE,
      async (payload) => {
        await handleUserRegistered(payload);
      },
    );

    await client.subscribe(
      'order.confirmed',
      ORDER_CONFIRMED_QUEUE,
      async (payload) => {
        await handleOrderConfirmed(payload);
      },
    );

    await client.subscribe(
      'order.cancelled',
      ORDER_CANCELLED_QUEUE,
      async (payload) => {
        await handleOrderCancelled(payload);
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
