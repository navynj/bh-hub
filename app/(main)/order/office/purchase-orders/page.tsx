import { auth } from '@/lib/auth';
import { prisma } from '@/lib/core/prisma';
import { format } from 'date-fns';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 50;

function formatMoney(amount: unknown, currency: string): string {
  if (amount == null) return '—';
  const n =
    typeof amount === 'object' && 'toNumber' in (amount as object)
      ? (amount as { toNumber: () => number }).toNumber()
      : Number(amount);
  if (Number.isNaN(n)) return '—';
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currency || 'USD',
    }).format(n);
  } catch {
    return `${n} ${currency}`;
  }
}

function formatDate(d: Date | null | undefined): string {
  if (!d) return '—';
  try {
    return format(d, 'yyyy-MM-dd');
  } catch {
    return '—';
  }
}

function formatDateTime(d: Date | null | undefined): string {
  if (!d) return '—';
  try {
    return format(d, 'yyyy-MM-dd HH:mm');
  } catch {
    return '—';
  }
}

export default async function OfficePurchaseOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/auth');

  const { page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? '1', 10) || 1);
  const skip = (page - 1) * PAGE_SIZE;

  const [rows, totalCount] = await Promise.all([
    prisma.purchaseOrder.findMany({
      orderBy: [{ sourceCreatedAt: 'desc' }, { createdAt: 'desc' }],
      take: PAGE_SIZE,
      skip,
      select: {
        id: true,
        poNumber: true,
        status: true,
        currency: true,
        isAuto: true,
        dateCreated: true,
        sourceCreatedAt: true,
        expectedDate: true,
        totalPrice: true,
        supplier: { select: { company: true, contactName: true } },
        _count: { select: { lineItems: true, shopifyOrders: true } },
      },
    }),
    prisma.purchaseOrder.count(),
  ]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div className="max-w-6xl space-y-4">
      <div>
        <h1 className="text-lg font-semibold">Office — Purchase Orders</h1>
        <p className="text-sm text-muted-foreground">
          {totalCount} purchase order{totalCount === 1 ? '' : 's'} total
          {totalPages > 1 ? ` · Page ${page} of ${totalPages}` : ''}.
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No purchase orders in the database yet. Import runs via{' '}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">
            pnpm import:po
          </code>
          .
        </p>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            Showing {rows.length} purchase order{rows.length === 1 ? '' : 's'}.
          </p>
          <div className="relative w-full overflow-auto rounded-md border">
            <table className="w-full caption-bottom text-sm">
              <thead className="[&_tr]:border-b">
                <tr className="border-b transition-colors hover:bg-muted/50">
                  <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground">
                    PO #
                  </th>
                  <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground">
                    Status
                  </th>
                  <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground">
                    Supplier
                  </th>
                  <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground">
                    Created
                  </th>
                  <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground">
                    Expected
                  </th>
                  <th className="h-10 px-2 text-right align-middle font-medium text-muted-foreground">
                    Total
                  </th>
                  <th className="h-10 px-2 text-center align-middle font-medium text-muted-foreground">
                    Auto
                  </th>
                  <th className="h-10 px-2 text-right align-middle font-medium text-muted-foreground">
                    Lines
                  </th>
                  <th className="h-10 px-2 text-right align-middle font-medium text-muted-foreground">
                    Orders
                  </th>
                </tr>
              </thead>
              <tbody className="[&_tr:last-child]:border-0">
                {rows.map((po) => {
                  const supplier =
                    po.supplier?.company?.trim() ||
                    po.supplier?.contactName?.trim() ||
                    '—';
                  const created = po.sourceCreatedAt ?? po.dateCreated;
                  return (
                    <tr
                      key={po.id}
                      className="border-b transition-colors hover:bg-muted/50"
                    >
                      <td className="p-2 align-middle font-medium">
                        {po.poNumber}
                      </td>
                      <td className="p-2 align-middle capitalize">{po.status}</td>
                      <td className="max-w-[14rem] p-2 align-middle">
                        {supplier}
                      </td>
                      <td className="whitespace-nowrap p-2 align-middle text-muted-foreground">
                        {formatDateTime(created ?? undefined)}
                      </td>
                      <td className="whitespace-nowrap p-2 align-middle text-muted-foreground">
                        {formatDate(po.expectedDate)}
                      </td>
                      <td className="p-2 text-right align-middle tabular-nums">
                        {formatMoney(po.totalPrice, po.currency)}
                      </td>
                      <td className="p-2 text-center align-middle">
                        {po.isAuto ? 'Yes' : 'No'}
                      </td>
                      <td className="p-2 text-right align-middle tabular-nums">
                        {po._count.lineItems}
                      </td>
                      <td className="p-2 text-right align-middle tabular-nums">
                        {po._count.shopifyOrders}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-3">
              {page > 1 ? (
                <Link
                  href={page === 2 ? '/order/office/purchase-orders' : `/order/office/purchase-orders?page=${page - 1}`}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  &larr; Previous
                </Link>
              ) : (
                <div />
              )}
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              {page < totalPages ? (
                <Link
                  href={`/order/office/purchase-orders?page=${page + 1}`}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Next &rarr;
                </Link>
              ) : (
                <div />
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
