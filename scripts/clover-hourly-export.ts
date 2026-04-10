/**
 * Export hourly Clover **Net sales** for all 4 locations from July 2024 to today.
 * Per payment: amount − taxAmount − tipAmount (Clover payment fields), then summed by hour.
 * Rows = hours (0–23), Columns = dates (very wide).
 * One CSV per location saved to ./exports/clover-hourly-{name}.csv
 *
 * Clover's GET /payments only returns ~90 days per query; this script fetches in
 * 90-day windows and merges (see https://docs.clover.com/dev/docs/get-all-payments).
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: new URL('../.env', import.meta.url).pathname });

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const EXPORTS_DIR = join(__dirname, '../exports');

const CLOVER_BASE = process.env.CLOVER_API_BASE_URL?.trim() || 'https://api.clover.com';
const MAX_LIMIT = 1000;
/** Clover GET /payments caps each query to ~90 days of results; use inclusive 90-day windows. */
const CHUNK_INCLUSIVE_DAYS = 90;

// ── Types ──────────────────────────────────────────────────────────────────

type Payment = {
  id?: string;
  amount?: number;
  taxAmount?: number;
  tipAmount?: number;
  createdTime?: number;
  result?: string;
};

/** Clover dashboard Net sales (approx.): pre-tax, pre-tip per payment. */
function paymentNetSalesCents(p: Payment): number {
  if (typeof p.amount !== 'number') return 0;
  const tax = typeof p.taxAmount === 'number' ? p.taxAmount : 0;
  const tip = typeof p.tipAmount === 'number' ? p.tipAmount : 0;
  return p.amount - tax - tip;
}

// ── Clover fetch ───────────────────────────────────────────────────────────

function startOfLocalDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfLocalDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function addLocalDays(d: Date, days: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

function* eachPaymentChunk(rangeStart: Date, rangeEnd: Date): Generator<{ from: Date; to: Date }> {
  let cur = startOfLocalDay(rangeStart);
  const cap = endOfLocalDay(rangeEnd);
  while (cur.getTime() <= cap.getTime()) {
    const from = new Date(cur);
    let to = endOfLocalDay(addLocalDays(from, CHUNK_INCLUSIVE_DAYS - 1));
    if (to.getTime() > cap.getTime()) to = new Date(cap);
    yield { from, to };
    cur = startOfLocalDay(addLocalDays(from, CHUNK_INCLUSIVE_DAYS));
  }
}

async function fetchPaymentsWindow(
  merchantId: string,
  token: string,
  startMs: number,
  endMs: number,
): Promise<Payment[]> {
  const out: Payment[] = [];
  let offset = 0;

  for (;;) {
    const qs = new URLSearchParams({
      limit: String(MAX_LIMIT),
      offset: String(offset),
    });
    qs.append('filter', `createdTime>=${startMs}`);
    qs.append('filter', `createdTime<=${endMs}`);

    const url = `${CLOVER_BASE}/v3/merchants/${merchantId}/payments?${qs}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, accept: 'application/json' },
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Clover ${res.status}: ${text.slice(0, 300)}`);
    }

    const json = (await res.json()) as { elements?: Payment[] };
    const els = json.elements ?? [];

    for (const p of els) {
      if (p.result === 'SUCCESS' && typeof p.amount === 'number') {
        out.push(p);
      }
    }

    if (els.length < MAX_LIMIT) break;
    offset += MAX_LIMIT;
  }

  return out;
}

function fmtLocalYmd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

async function fetchAllPaymentsChunked(
  merchantId: string,
  token: string,
  rangeStart: Date,
  rangeEnd: Date,
): Promise<Payment[]> {
  const seen = new Set<string>();
  const merged: Payment[] = [];
  let chunkIndex = 0;
  for (const { from, to } of eachPaymentChunk(rangeStart, rangeEnd)) {
    chunkIndex += 1;
    const label = `${chunkIndex}: ${fmtLocalYmd(from)} … ${fmtLocalYmd(to)}`;
    console.log(`  [${label}] fetching…`);
    const chunk = await fetchPaymentsWindow(merchantId, token, from.getTime(), to.getTime());
    console.log(`  [${label}] ${chunk.length} SUCCESS payments`);
    for (const p of chunk) {
      if (p.id != null && p.id !== '') {
        if (seen.has(p.id)) continue;
        seen.add(p.id);
      }
      merged.push(p);
    }
  }
  return merged;
}

// ── Date helpers ───────────────────────────────────────────────────────────

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

/** All calendar dates (yyyy-MM-dd) from start to end inclusive. */
function allDates(start: Date, end: Date): string[] {
  const dates: string[] = [];
  const cur = new Date(start);
  cur.setHours(0, 0, 0, 0);
  const endTs = new Date(end);
  endTs.setHours(23, 59, 59, 999);

  while (cur <= endTs) {
    dates.push(
      `${cur.getFullYear()}-${pad2(cur.getMonth() + 1)}-${pad2(cur.getDate())}`,
    );
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

function tsToDateHour(ms: number): { date: string; hour: number } {
  const d = new Date(ms);
  return {
    date: `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`,
    hour: d.getHours(),
  };
}

// ── CSV builder ────────────────────────────────────────────────────────────

function buildCsv(
  locationName: string,
  payments: Payment[],
  startDate: Date,
  endDate: Date,
): string {
  // Trim date range to the actual earliest payment so the CSV isn't
  // padded with hundreds of empty columns before data starts.
  let effectiveStart = startDate;
  if (payments.length > 0) {
    const earliest = payments.reduce(
      (min, p) => (p.createdTime != null && p.createdTime < min ? p.createdTime : min),
      Infinity,
    );
    if (isFinite(earliest)) {
      const d = new Date(earliest);
      d.setHours(0, 0, 0, 0);
      if (d > effectiveStart) effectiveStart = d;
    }
  }

  const dates = allDates(effectiveStart, endDate);

  // { date → { hour → revenue } }
  const map = new Map<string, Map<number, number>>();
  for (const d of dates) map.set(d, new Map());

  for (const p of payments) {
    if (p.createdTime == null) continue;
    const { date, hour } = tsToDateHour(p.createdTime);
    const dayMap = map.get(date);
    if (!dayMap) continue; // outside range
    dayMap.set(hour, (dayMap.get(hour) ?? 0) + paymentNetSalesCents(p) / 100);
  }

  const rows: string[] = [];

  // Header row: "Hour" + all date columns
  rows.push(['Hour', ...dates].map((v) => `"${v}"`).join(','));

  // Data rows: one per hour 0–23
  for (let h = 0; h < 24; h++) {
    const label = h === 0 ? '12am' : h < 12 ? `${h}am` : h === 12 ? '12pm' : `${h - 12}pm`;
    const cells: (string | number)[] = [label];
    for (const d of dates) {
      const rev = map.get(d)?.get(h) ?? 0;
      cells.push(rev > 0 ? rev.toFixed(2) : '');
    }
    rows.push(cells.map((v) => (typeof v === 'number' ? v : `"${v}"`)).join(','));
  }

  // Summary row: daily totals
  const totalCells: (string | number)[] = ['"Daily Total"'];
  for (const d of dates) {
    const dayMap = map.get(d)!;
    const total = [...dayMap.values()].reduce((s, v) => s + v, 0);
    totalCells.push(total > 0 ? total.toFixed(2) : '');
  }
  rows.push(totalCells.map((v) => (typeof v === 'number' ? v : String(v))).join(','));

  return rows.join('\n');
}

// ── Main ───────────────────────────────────────────────────────────────────

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const prisma = new PrismaClient({ adapter });

  let locations: { id: string; name: string; cloverMerchantId: string | null; cloverToken: string | null }[];
  try {
    locations = await prisma.location.findMany({
      select: { id: true, name: true, cloverMerchantId: true, cloverToken: true },
    });
  } finally {
    await prisma.$disconnect();
  }

  const configured = locations.filter(
    (l) => l.cloverMerchantId?.trim() && l.cloverToken?.trim(),
  );

  console.log(`Found ${configured.length} location(s) with Clover credentials:`);
  configured.forEach((l) => console.log(`  • ${l.name} (${l.cloverMerchantId})`));

  const startDate = new Date('2024-07-01T00:00:00');
  const endDate = new Date(); // now

  mkdirSync(EXPORTS_DIR, { recursive: true });

  for (const loc of configured) {
    const merchantId = loc.cloverMerchantId!.trim();
    const token = loc.cloverToken!.trim();
    const safeName = loc.name.replace(/[^a-zA-Z0-9]/g, '_');

    console.log(`\n[${loc.name}] Fetching payments Jul 2024 → today (${CHUNK_INCLUSIVE_DAYS}d chunks, Clover API limit)…`);
    let payments: Payment[];
    try {
      payments = await fetchAllPaymentsChunked(merchantId, token, startDate, endDate);
    } catch (err) {
      console.error(`  ✗ Error: ${(err as Error).message}`);
      continue;
    }

    console.log(`  ✓ ${payments.length} payments fetched`);

    const csv = buildCsv(loc.name, payments, startDate, endDate);
    const outPath = join(EXPORTS_DIR, `clover-hourly-${safeName}.csv`);
    writeFileSync(outPath, csv, 'utf8');
    console.log(`  ✓ Saved → ${outPath}`);
  }

  console.log('\nDone.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
