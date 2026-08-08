export type ParseResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export function parseOrFail<T>(
  payload: unknown,
  guard: (value: unknown) => value is T,
  errorMessage: string,
): ParseResult<T> {
  if (guard(payload)) {
    return { success: true, data: payload };
  }

  return { success: false, error: errorMessage };
}
