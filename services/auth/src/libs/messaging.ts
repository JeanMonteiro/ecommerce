import {
  createMessagingClient,
  type MessagingClient,
} from '@ecommerce/messaging';

let client: MessagingClient | null = null;

export async function initMessaging(): Promise<MessagingClient> {
  if (!client) {
    client = await createMessagingClient();
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
  payload: unknown
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
