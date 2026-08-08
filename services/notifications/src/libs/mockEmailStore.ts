export type MockEmailType = 'welcome' | 'order-confirmed' | 'order-cancelled';

export interface MockEmail {
  id: string;
  type: MockEmailType;
  to: { userId: number; username?: string };
  subject: string;
  body: string;
  sentAt: string;
  payload: unknown;
}

const DEFAULT_MAX_STORED = 100;

let maxStored = DEFAULT_MAX_STORED;
const emails: MockEmail[] = [];

function getMaxStored(): number {
  const configured = process.env.NOTIFICATIONS_MAX_STORED;
  if (!configured) {
    return maxStored;
  }

  const parsed = Number.parseInt(configured, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : maxStored;
}

export function sendMockEmail(
  email: Omit<MockEmail, 'id' | 'sentAt'>,
): MockEmail {
  const record: MockEmail = {
    ...email,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    sentAt: new Date().toISOString(),
  };

  console.log(
    JSON.stringify({
      event: 'mock-email-sent',
      type: record.type,
      to: record.to,
      subject: record.subject,
      body: record.body,
      sentAt: record.sentAt,
    }),
  );

  emails.unshift(record);

  const limit = getMaxStored();
  while (emails.length > limit) {
    emails.pop();
  }

  return record;
}

export function getMockEmails(limit = 50): MockEmail[] {
  const safeLimit = Number.isInteger(limit) && limit > 0 ? limit : 50;
  return emails.slice(0, Math.min(safeLimit, emails.length));
}

export function resetMockEmailStoreForTests(): void {
  emails.length = 0;
  maxStored = DEFAULT_MAX_STORED;
}
