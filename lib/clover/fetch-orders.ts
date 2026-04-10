import { cloverFetch, sleepBetweenCloverPages } from './clover-fetch';
import { getCloverApiBaseUrl } from './config';

export type CloverLineItemResult = {
  lineItemId: string;
  itemId: string | null;
  name: string;
  /** Unit price in cents */
  priceCents: number;
  /** Actual quantity (unitQty / 1000 per Clover spec) */
  quantity: number;
  orderedAtMs: number;
};

type RawLineItem = {
  id?: string;
  name?: string;
  price?: number;
  unitQty?: number;
  item?: { id?: string };
};

type RawOrder = {
  id?: string;
  createdTime?: number;
  lineItems?: { elements?: RawLineItem[] };
};

type CloverOrdersResponse = {
  elements?: RawOrder[];
};

const MAX_LIMIT = 1000;

/**
 * Fetch all order line items for a merchant in [startMs, endMs] (ms timestamps).
 * Prices are in cents. Quantities are in actual units (unitQty / 1000).
 */
export async function fetchCloverOrderItemsInRange(
  merchantId: string,
  token: string,
  startMs: number,
  endMs: number,
): Promise<CloverLineItemResult[]> {
  const base = getCloverApiBaseUrl();
  const out: CloverLineItemResult[] = [];
  let offset = 0;

  for (;;) {
    const qs = new URLSearchParams({
      expand: 'lineItems',
      limit: String(MAX_LIMIT),
      offset: String(offset),
    });
    qs.append('filter', `createdTime>=${startMs}`);
    qs.append('filter', `createdTime<=${endMs}`);
    const url = `${base}/v3/merchants/${merchantId}/orders?${qs.toString()}`;

    if (offset > 0) await sleepBetweenCloverPages();
    const res = await cloverFetch(url, token);

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Clover orders ${res.status}: ${text.slice(0, 200)}`);
    }

    const json = (await res.json()) as CloverOrdersResponse;
    const elements = json.elements ?? [];

    for (const order of elements) {
      const orderedAt = order.createdTime ?? 0;
      for (const li of order.lineItems?.elements ?? []) {
        const rawQty = li.unitQty ?? 1000;
        const qty = rawQty / 1000;
        if (qty <= 0) continue;
        out.push({
          lineItemId: li.id ?? '',
          itemId: li.item?.id ?? null,
          name: (li.name ?? '').trim() || 'Unknown',
          priceCents: li.price ?? 0,
          quantity: qty,
          orderedAtMs: orderedAt,
        });
      }
    }

    if (elements.length < MAX_LIMIT) break;
    offset += MAX_LIMIT;
  }

  return out;
}
