/** Delay between paginated Clover requests to reduce 429 rate limits. */
export const CLOVER_PAGE_GAP_MS = 100;

function parseRetryAfterMs(res: Response): number | null {
  const h = res.headers.get('retry-after');
  if (!h) return null;
  const sec = parseInt(h, 10);
  if (!Number.isNaN(sec)) return Math.min(sec * 1000, 60_000);
  const d = Date.parse(h);
  if (!Number.isNaN(d)) return Math.max(0, d - Date.now());
  return null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * GET with Clover bearer token; retries 429/503 with Retry-After or exponential backoff.
 */
export async function cloverFetch(
  url: string,
  token: string,
  options?: { maxRetries?: number },
): Promise<Response> {
  const maxRetries = options?.maxRetries ?? 6;
  let attempt = 0;
  for (;;) {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        accept: 'application/json',
      },
      cache: 'no-store',
    });

    if (res.status !== 429 && res.status !== 503) return res;
    if (attempt >= maxRetries) return res;

    const fromHeader = parseRetryAfterMs(res);
    const backoff = fromHeader ?? Math.min(1000 * 2 ** attempt, 20_000);
    await sleep(backoff);
    attempt += 1;
  }
}

export async function sleepBetweenCloverPages(): Promise<void> {
  await sleep(CLOVER_PAGE_GAP_MS);
}
