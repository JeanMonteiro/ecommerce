import {
  createMessagingClient,
  type MessagingClient,
} from '@ecommerce/messaging';
import { handleOrderCreated } from '../handlers/orderCreated';
import { handleOrderConfirmed } from '../handlers/orderConfirmed';
import { handleOrderCancelled } from '../handlers/orderCancelled';
import { handleProductCreated } from '../handlers/productCreated';

const PRODUCT_CREATED_QUEUE = 'inventory.product-created';
const ORDER_CREATED_QUEUE = 'inventory.order-created';
const ORDER_CONFIRMED_QUEUE = 'inventory.order-confirmed';
const ORDER_CANCELLED_QUEUE = 'inventory.order-cancelled';

let client: MessagingClient | null = null;

export async function initMessaging(): Promise<MessagingClient> {
  if (!client) {
    client = await createMessagingClient();
    const publish = (routingKey: string, payload: unknown) =>
      client!.publish(routingKey, payload);

    await client.subscribe(
      'product.created',
      PRODUCT_CREATED_QUEUE,
      async (payload) => {
        await handleProductCreated(payload);
      },
    );
    await client.subscribe(
      'order.created',
      ORDER_CREATED_QUEUE,
      async (payload) => {
        await handleOrderCreated(payload, { publish });
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

export async function publishEvent(
  routingKey: string,
  payload: unknown,
): Promise<void> {
  const messaging = await getMessagingClient();
  await messaging.publish(routingKey, payload);
}

export async function getMessagingClient(): Promise<MessagingClient> {
  if (!client) {
    return initMessaging();
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
