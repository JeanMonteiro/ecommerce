import {
  sendMockEmail,
  type MockEmail,
} from '../libs/mockEmailStore';

export interface UserRegisteredPayload {
  userId: number;
  username: string;
}

export function isUserRegisteredPayload(
  payload: unknown,
): payload is UserRegisteredPayload {
  if (!payload || typeof payload !== 'object') {
    return false;
  }

  const { userId, username } = payload as UserRegisteredPayload;
  return (
    Number.isInteger(userId) &&
    userId > 0 &&
    typeof username === 'string' &&
    username.trim().length > 0
  );
}

export type SendMockEmailFn = typeof sendMockEmail;

export async function handleUserRegistered(
  payload: unknown,
  deps: {
    sendEmail?: SendMockEmailFn;
  } = {},
): Promise<MockEmail> {
  if (!isUserRegisteredPayload(payload)) {
    throw new Error('Invalid user.registered payload');
  }

  const sendEmail = deps.sendEmail ?? sendMockEmail;

  return sendEmail({
    type: 'welcome',
    to: { userId: payload.userId, username: payload.username },
    subject: 'Welcome to our store!',
    body: `Hi ${payload.username}, thanks for registering.`,
    payload,
  });
}
