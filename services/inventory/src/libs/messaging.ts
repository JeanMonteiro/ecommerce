import {
  createMessagingClient,
  type MessagingClient,
} from '@ecommerce/messaging';
import { handleProductCreated } from '../handlers/productCreated';

let client: MessagingClient | null = null;

export async function initMessaging(): Promise<MessagingClient> {
  if (!client) {
    client = await createMessagingClient();
    await client.subscribe(
      'product.created',
      'inventory.product-created',
      async (payload) => {
        await handleProductCreated(payload);
      }
    );
  }

  return client;
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
