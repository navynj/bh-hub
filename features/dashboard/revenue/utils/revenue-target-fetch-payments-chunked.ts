import { fetchCloverPaymentsInRange } from '@/lib/clover/fetch-payments';
import { sleepBetweenCloverPages } from '@/lib/clover/clover-fetch';

/** Clover payment queries are safest under ~90 days per window. */
const CHUNK_MS = 80 * 24 * 60 * 60 * 1000;

export async function fetchCloverPaymentsChunked(
  merchantId: string,
  token: string,
  startMs: number,
  endMs: number,
): Promise<Awaited<ReturnType<typeof fetchCloverPaymentsInRange>>> {
  const out: Awaited<ReturnType<typeof fetchCloverPaymentsInRange>> = [];
  for (let t = startMs; t <= endMs; t += CHUNK_MS) {
    const chunkEnd = Math.min(t + CHUNK_MS - 1, endMs);
    const part = await fetchCloverPaymentsInRange(merchantId, token, t, chunkEnd);
    out.push(...part);
    if (chunkEnd < endMs) await sleepBetweenCloverPages();
  }
  return out;
}
