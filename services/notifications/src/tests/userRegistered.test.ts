import {
  handleUserRegistered,
  type UserRegisteredPayload,
} from '../handlers/userRegistered';
import type { SendMockEmailFn } from '../handlers/userRegistered';

describe('handleUserRegistered', () => {
  const payload: UserRegisteredPayload = {
    userId: 7,
    username: 'alice',
  };

  const sendEmail = jest.fn() as jest.MockedFunction<SendMockEmailFn>;

  beforeEach(() => {
    jest.clearAllMocks();
    sendEmail.mockReturnValue({
      id: 'mock-id',
      type: 'welcome',
      to: { userId: 7, username: 'alice' },
      subject: 'Welcome to our store!',
      body: 'Hi alice, thanks for registering.',
      sentAt: new Date().toISOString(),
      payload,
    });
  });

  it('sends a welcome mock email', async () => {
    await handleUserRegistered(payload, { sendEmail });

    expect(sendEmail).toHaveBeenCalledWith({
      type: 'welcome',
      to: { userId: 7, username: 'alice' },
      subject: 'Welcome to our store!',
      body: 'Hi alice, thanks for registering.',
      payload,
    });
  });

  it('throws when payload is invalid', async () => {
    await expect(
      handleUserRegistered({ userId: 0, username: 'alice' }, { sendEmail }),
    ).rejects.toThrow('Invalid user.registered payload');

    expect(sendEmail).not.toHaveBeenCalled();
  });
});
