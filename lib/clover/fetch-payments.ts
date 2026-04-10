import { cloverFetch, sleepBetweenCloverPages } from './clover-fetch';
import { getCloverApiBaseUrl } from './config';

type CloverApiPayment = {
  id?: string;
  amount?: number;
  createdTime?: number;
  result?: string;
  tender?: {
    id?: string;
    label?: string;
  };
};

type CloverPaymentsResponse = {
  elements?: CloverApiPayment[];
};

const MAX_LIMIT = 1000;

/**
 * Fetch payments in [startMs, endMs] (Clover timestamps, ms), with pagination.
 * Amounts are in cents. Only SUCCESS payments are included.
 */
export async function fetchCloverPaymentsInRange(
  merchantId: string,
  token: string,
  startMs: number,
  endMs: number,
): Promise<CloverApiPayment[]> {
  const base = getCloverApiBaseUrl();
  const out: CloverApiPayment[] = [];
  let offset = 0;

  for (;;) {
    const qs = new URLSearchParams({
      expand: 'tender',
      limit: String(MAX_LIMIT),
      offset: String(offset),
    });
    qs.append('filter', `createdTime>=${startMs}`);
    qs.append('filter', `createdTime<=${endMs}`);
    const url = `${base}/v3/merchants/${merchantId}/payments?${qs.toString()}`;

    if (offset > 0) await sleepBetweenCloverPages();
    const res = await cloverFetch(url, token);

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Clover payments ${res.status}: ${text.slice(0, 200)}`);
    }

    const json = (await res.json()) as CloverPaymentsResponse;
    const elements = json.elements ?? [];
    for (const p of elements) {
      if (p.result === 'SUCCESS' && typeof p.amount === 'number') {
        out.push(p);
      }
    }
    if (elements.length < MAX_LIMIT) break;
    offset += MAX_LIMIT;
  }

  return out;
}
