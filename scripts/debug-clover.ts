import * as dotenv from 'dotenv';
dotenv.config({ path: new URL('../.env', import.meta.url).pathname });

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const prisma = new PrismaClient({ adapter });

  const loc = await prisma.location.findFirst({
    where: { cloverMerchantId: { not: null } },
    select: { name: true, cloverMerchantId: true, cloverToken: true },
  });
  await prisma.$disconnect();

  const base = process.env.CLOVER_API_BASE_URL || 'https://api.clover.com';
  const rangeStart = new Date('2024-07-01T00:00:00').getTime();
  const rangeEnd = new Date().getTime();

  const qs = new URLSearchParams({ limit: '5', offset: '0' });
  qs.append('filter', `createdTime>=${rangeStart}`);
  qs.append('filter', `createdTime<=${rangeEnd}`);
  const url = `${base}/v3/merchants/${loc!.cloverMerchantId}/payments?${qs}`;
  console.log('URL:', url);

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${loc!.cloverToken}`, accept: 'application/json' },
  });
  const json = await res.json() as { elements?: Record<string, unknown>[] };
  const payments = json.elements ?? [];
  console.log(`Got ${payments.length} payments with date filter`);

  for (const p of payments) {
    const ct = p['createdTime'] as number | undefined;
    const d = ct != null ? new Date(ct) : null;
    console.log({
      createdTime: ct,
      iso: d?.toISOString(),
      localDate: d ? `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` : null,
      localHour: d?.getHours(),
      amount: p['amount'],
      result: p['result'],
    });
  }

  // Also check total count without filter
  const qs2 = new URLSearchParams({ limit: '1', offset: '16000' });
  const url2 = `${base}/v3/merchants/${loc!.cloverMerchantId}/payments?${qs2}`;
  const res2 = await fetch(url2, {
    headers: { Authorization: `Bearer ${loc!.cloverToken}`, accept: 'application/json' },
  });
  const json2 = await res2.json() as { elements?: Record<string, unknown>[] };
  const els = json2.elements ?? [];
  console.log(`\nPayment at offset 16000 (no filter):`, els[0] ? { createdTime: els[0]['createdTime'], iso: new Date(els[0]['createdTime'] as number).toISOString() } : 'none');
}

main().catch(console.error);
