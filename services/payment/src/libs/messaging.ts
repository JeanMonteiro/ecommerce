import {
  createMessagingClient,
  type MessagingClient,
} from '@ecommerce/messaging';
import {
  handleStockReserved,
  type PaymentForceResult,
} from '../handlers/stockReserved';

const STOCK_RESERVED_QUEUE = 'payment.stock-reserved';

let client: MessagingClient | null = null;

function getForceResult(): PaymentForceResult {
  const value = process.env.PAYMENT_FORCE_RESULT ?? 'success';

  if (value === 'success' || value === 'failure' || value === 'random') {
    return value;
  }

  console.warn(
    `Invalid PAYMENT_FORCE_RESULT "${value}" — falling back to "success"`,
  );
  return 'success';
}

export async function initMessaging(): Promise<MessagingClient> {
  if (!client) {
    client = await createMessagingClient();
    const publish = (routingKey: string, payload: unknown) =>
      client!.publish(routingKey, payload);
    const forceResult = getForceResult();

    await client.subscribe(
      'stock.reserved',
      STOCK_RESERVED_QUEUE,
      async (payload) => {
        await handleStockReserved(payload, { publish, forceResult });
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
