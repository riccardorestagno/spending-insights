/**
 * Small helpers shared by everything that talks to the API.
 *
 * FastAPI reports errors two different ways, so unpacking them lives here
 * rather than being re-implemented next to every fetch call.
 */

/** FastAPI returns `detail` as a string for HTTPException, but as an array of
 *  error objects for request-validation failures. Normalize both. */
export const readDetail = (payload: unknown, fallback: string): string => {
  if (payload && typeof payload === 'object' && 'detail' in payload) {
    const detail = (payload as { detail: unknown }).detail;
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail)) {
      return detail
        .map((item) =>
          item && typeof item === 'object' && 'msg' in item
            ? String((item as { msg: unknown }).msg)
            : String(item)
        )
        .join('; ');
    }
  }
  return fallback;
};

/** fetch + JSON + error unpacking, so callers only handle the happy path. */
export const requestJson = async <T>(
  url: string,
  init?: RequestInit
): Promise<T> => {
  const response = await fetch(url, init);
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(readDetail(payload, `Request failed (${response.status})`));
  }

  return payload as T;
};

export const jsonBody = (body: unknown): RequestInit => ({
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});
