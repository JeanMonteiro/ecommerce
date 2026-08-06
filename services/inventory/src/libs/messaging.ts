import {
  createMessagingClient,
  type MessagingClient,
} from '@ecommerce/messaging';
import { handleOrderCreated } from '../handlers/orderCreated';
import { handleProductCreated } from '../handlers/productCreated';

const PRODUCT_CREATED_QUEUE = 'inventory.product-created';
const ORDER_CREATED_QUEUE = 'inventory.order-created';

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
