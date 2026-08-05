const MIN_PASSWORD_LENGTH = 6;

export type AuthInput =
  | { ok: true; username: string; password: string }
  | { ok: false; message: string };

export function validateAuthInput(body: unknown): AuthInput {
  if (!body || typeof body !== 'object') {
    return { ok: false, message: 'Request body is required' };
  }

  const { username, password } = body as Record<string, unknown>;

  if (typeof username !== 'string' || typeof password !== 'string') {
    return { ok: false, message: 'Username and password must be strings' };
  }

  const trimmedUsername = username.trim();
  if (!trimmedUsername) {
    return { ok: false, message: 'Username is required' };
  }

  if (!password) {
    return { ok: false, message: 'Password is required' };
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    return {
      ok: false,
      message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
    };
  }

  return { ok: true, username: trimmedUsername, password };
}
