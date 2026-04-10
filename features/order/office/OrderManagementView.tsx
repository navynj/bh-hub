'use client';

import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils/cn';
import { Card } from '@/components/ui/card';

// ── Static mock data ──────────────────────────────────────────────────────────

const SCHEDULE_PERIODS = [
  {
    id: 's0',
    label: 'Mar 24 – 30',
    meta: 'overdue · 3 pending',
    variant: 'overdue' as const,
    orders: ['1691', '1694', '1695'],
  },
  {
    id: 's1',
    label: 'Mar 31 – Apr 6',
    meta: 'due today · 4 orders',
    variant: 'today' as const,
    orders: ['1689', '1690', '1692', '1693'],
  },
  {
    id: 's2',
    label: 'Apr 7 – 13',
    meta: 'upcoming · 2 orders',
    variant: 'upcoming' as const,
    orders: ['1696', '1697'],
  },
  {
    id: 's3',
    label: 'Apr 14 – 20',
    meta: 'upcoming · 0 orders',
    variant: 'empty' as const,
    orders: [] as string[],
  },
];

const RAW_ORDERS = [
  { id: '1689', customer: 'John Kim', status: 'pending' },
  { id: '1690', customer: 'John Kim', status: 'po-created' },
  { id: '1691', customer: 'Mike Lee', status: 'pending' },
  { id: '1692', customer: 'Sarah Park', status: 'processing' },
  { id: '1693', customer: 'Sarah Park', status: 'po-created' },
  { id: '1694', customer: 'Mike Lee', status: 'no-items' },
  { id: '1695', customer: 'Mike Lee', status: 'pending' },
  { id: '1696', customer: 'Jenny Shin', status: 'sent' },
  { id: '1697', customer: 'Tom Yoo', status: 'pending' },
] as const;

type SupplierStatus = 'missing-email' | 'pending' | 'po-created';
type SupplierItem = { sku: string; name: string; qty: number; price: string };

type Supplier = {
  name: string;
  itemCount: number;
  email: string | null;
  status: SupplierStatus;
  items: SupplierItem[] | null;
  po: string | null;
  poNote?: string;
};

type CustomerGroup = {
  id: string;
  name: string;
  email: string;
  meta: string;
  status: 'pending' | 'po-created';
  orders: string[];
  suppliers: Supplier[];
};

const CUSTOMER_GROUPS: CustomerGroup[] = [
  {
    id: 'john',
    name: 'John Kim',
    email: 'john@example.com',
    meta: '2 suppliers · 5 items',
    status: 'pending',
    orders: ['1689', '1690'],
    suppliers: [
      {
        name: 'Supplier A',
        itemCount: 3,
        email: null,
        status: 'missing-email',
        items: [
          { sku: 'SKU-001', name: 'Blue Widget 500ml', qty: 2, price: '$24.00' },
          { sku: 'SKU-002', name: 'Red Widget Pro', qty: 1, price: '$38.50' },
        ],
        po: null,
      },
      {
        name: 'Supplier B',
        itemCount: 2,
        email: 'supplier-b@example.com',
        status: 'pending',
        items: null,
        po: null,
      },
    ],
  },
  {
    id: 'sarah',
    name: 'Sarah Park',
    email: 'sarah@corp.com',
    meta: '1 supplier · 3 items',
    status: 'po-created',
    orders: ['1692', '1693'],
    suppliers: [
      {
        name: 'Supplier C',
        itemCount: 3,
        email: 'supplier-c@example.com',
        status: 'po-created',
        items: null,
        po: '#0042',
        poNote: 'PO sent 2025-04-05 · supplier-c@example.com',
      },
    ],
  },
  {
    id: 'mike',
    name: 'Mike Lee',
    email: 'mike@example.com',
    meta: '1 supplier · 2 items',
    status: 'pending',
    orders: ['1691', '1694', '1695'],
    suppliers: [
      {
        name: 'Supplier D',
        itemCount: 2,
        email: 'supplier-d@example.com',
        status: 'pending',
        items: null,
        po: null,
      },
    ],
  },
];

// ── Helper components ─────────────────────────────────────────────────────────

type BadgeVariant = 'blue' | 'amber' | 'green' | 'gray' | 'purple';

function Badge({
  variant = 'gray',
  children,
  className,
}: {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}) {
  const styles: Record<BadgeVariant, string> = {
    blue: 'bg-blue-50 text-blue-800',
    amber: 'bg-amber-50 text-amber-800',
    green: 'bg-green-50 text-green-800',
    gray: 'bg-neutral-100 text-neutral-600',
    purple: 'bg-purple-50 text-purple-800',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium whitespace-nowrap',
        styles[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}

function Btn({
  variant = 'default',
  children,
  onClick,
  className,
}: {
  variant?: 'default' | 'primary' | 'danger';
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  const styles = {
    default: 'border-border bg-background text-foreground hover:bg-muted',
    primary: 'border-transparent bg-foreground text-background hover:bg-foreground/90',
    danger: 'border-red-300 text-red-700 hover:bg-red-50',
  };
  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1 px-2.5 py-1 border rounded-md text-[11px] font-medium cursor-pointer whitespace-nowrap transition-colors',
        styles[variant],
        className,
      )}
    >
      {children}
    </button>
  );
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'pending':
      return <Badge variant="amber">pending</Badge>;
    case 'processing':
      return <Badge variant="blue">processing</Badge>;
    case 'po-created':
      return <Badge variant="green">PO created</Badge>;
    case 'sent':
      return <Badge variant="purple">sent</Badge>;
    case 'no-items':
      return <Badge variant="gray">no items</Badge>;
    default:
      return <Badge>{status}</Badge>;
  }
}

const DOT_COLOR: Record<string, string> = {
  overdue: 'bg-red-500',
  today: 'bg-amber-500',
  upcoming: 'bg-blue-600',
  empty: 'bg-neutral-400',
};

const TABS = ['Pending', 'Generated POs', 'All orders', 'Schedule & settings'];

// ── Main component ────────────────────────────────────────────────────────────

export function OrderManagementView() {
  const [selectedPeriod, setSelectedPeriod] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [search, setSearch] = useState('');

  const selectedSchedule = SCHEDULE_PERIODS.find((p) => p.id === selectedPeriod) ?? null;
  const activeOrders: string[] | null = selectedSchedule ? selectedSchedule.orders : null;

  const filteredRawOrders = useMemo(() => {
    return RAW_ORDERS.filter((o) => {
      if (activeOrders && !activeOrders.includes(o.id)) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return o.id.includes(q) || o.customer.toLowerCase().includes(q);
      }
      return true;
    });
  }, [activeOrders, search]);

  function handlePeriodClick(id: string) {
    setSelectedPeriod((prev) => (prev === id ? null : id));
  }

  function clearFilter() {
    setSelectedPeriod(null);
  }

  const tabBadges: (React.ReactNode)[] = [
    <Badge key="p" variant="amber">{activeOrders ? activeOrders.length : 9}</Badge>,
    <Badge key="g" variant="green">5</Badge>,
    null,
    null,
  ];

  return (
    <div className="flex flex-col border rounded-xl overflow-hidden bg-background">
      {/* Topbar */}
      <div className="bg-background border-b px-5 py-2.5 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <span className="text-base font-medium">Order management</span>
          <Badge variant="gray">
            {selectedSchedule ? selectedSchedule.label : 'showing all'}
          </Badge>
        </div>
        <div className="flex gap-1.5">
          <Btn>Export CSV</Btn>
          <Btn variant="primary">Generate POs</Btn>
        </div>
      </div>

      {/* Schedule rail */}
      <div className="bg-background border-b px-5 py-2.5 flex items-center gap-2 overflow-x-auto flex-shrink-0">
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mr-1 whitespace-nowrap">
          Upcoming
        </span>
        {SCHEDULE_PERIODS.map((period) => {
          const isSelected = selectedPeriod === period.id;
          return (
            <button
              key={period.id}
              onClick={() => handlePeriodClick(period.id)}
              className={cn(
                'flex flex-col gap-0.5 px-3 py-1.5 rounded-lg border cursor-pointer whitespace-nowrap min-w-[130px] flex-shrink-0 transition-colors text-left',
                isSelected
                  ? 'border-blue-600 bg-blue-50'
                  : period.variant === 'overdue'
                    ? 'border-red-300 bg-background hover:bg-muted'
                    : 'border-border bg-background hover:bg-muted',
              )}
            >
              <span
                className={cn(
                  'text-[12px] font-medium',
                  isSelected ? 'text-blue-900' : 'text-foreground',
                )}
              >
                {period.label}
              </span>
              <span
                className={cn(
                  'text-[10px] flex gap-1 items-center',
                  isSelected ? 'text-blue-700' : 'text-muted-foreground',
                )}
              >
                <span
                  className={cn(
                    'w-[5px] h-[5px] rounded-full flex-shrink-0',
                    DOT_COLOR[period.variant],
                  )}
                />
                {period.meta}
              </span>
            </button>
          );
        })}
      </div>

      {/* Tabs */}
      <div className="flex bg-background border-b px-5 flex-shrink-0 overflow-x-auto">
        {TABS.map((tab, i) => (
          <button
            key={tab}
            onClick={() => setActiveTab(i)}
            className={cn(
              'px-3.5 py-2 text-[13px] cursor-pointer border-b-2 -mb-px whitespace-nowrap flex items-center gap-1.5 transition-colors',
              activeTab === i
                ? 'text-foreground border-foreground font-medium'
                : 'text-muted-foreground border-transparent hover:text-foreground',
            )}
          >
            {tab}
            {tabBadges[i]}
          </button>
        ))}
      </div>

      {/* Filter context bar */}
      {selectedSchedule && (
        <div className="bg-blue-50 border-b border-blue-200 px-5 py-1.5 flex items-center gap-2.5 text-[12px] text-blue-800 flex-shrink-0">
          <span>Schedule:</span>
          <span className="font-medium">{selectedSchedule.label}</span>
          <span className="text-blue-600 text-[11px]">
            {selectedSchedule.orders.length} orders in period
          </span>
          <button
            onClick={clearFilter}
            className="ml-auto text-[11px] underline underline-offset-2 cursor-pointer hover:no-underline"
          >
            Clear filter ×
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="flex gap-2 p-2.5 bg-muted/50 flex-shrink-0">
        {[
          { value: activeOrders ? activeOrders.length : 47, label: 'Shopify orders' },
          { value: 12, label: 'Pending PO' },
          { value: 8, label: 'Suppliers' },
          { value: 5, label: 'POs generated' },
        ].map((stat) => (
          <div
            key={stat.label}
            className="flex-1 bg-background rounded-lg px-3 py-2 text-center"
          >
            <div className="text-xl font-medium">{stat.value}</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Main content */}
      <div className="flex bg-muted/50 min-h-[480px]">
        {/* Left panel — Customer → Supplier groups */}
        <div className="flex-1 min-w-0 flex flex-col">
          <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide px-4 py-2.5">
            Customer → Supplier grouping
          </div>

          {CUSTOMER_GROUPS.map((cust) => {
            const visibleOrders = cust.orders.filter(
              (o) => !activeOrders || activeOrders.includes(o),
            );
            const hiddenOrders = cust.orders.filter(
              (o) => activeOrders !== null && !activeOrders.includes(o),
            );
            const isDimmed = activeOrders !== null && visibleOrders.length === 0;

            return (
              <div
                key={cust.id}
                className={cn(
                  'mx-3 mb-3 transition-opacity',
                  isDimmed && 'opacity-30 pointer-events-none',
                )}
              >
                {/* Customer section header */}
                <div className="flex items-center justify-between px-1 py-1.5 mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[13px] font-semibold truncate">{cust.name}</span>
                    <span className="text-[11px] text-muted-foreground hidden sm:inline truncate">
                      {cust.email}
                    </span>
                    <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                      {cust.meta}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {hiddenOrders.length > 0 && (
                      <button
                        onClick={clearFilter}
                        className="inline-flex items-center px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 text-[10px] font-medium cursor-pointer border border-amber-300 hover:bg-amber-100"
                      >
                        +{hiddenOrders.length} order{hiddenOrders.length > 1 ? 's' : ''} hidden
                      </button>
                    )}
                    {cust.status === 'pending' ? (
                      <Badge variant="amber">pending</Badge>
                    ) : (
                      <Badge variant="green">PO created</Badge>
                    )}
                    <Btn>
                      {cust.status === 'pending' ? 'Create all POs' : 'View PO'}
                    </Btn>
                  </div>
                </div>

                {/* Supplier PO cards — each card = one purchase order */}
                <div className="flex flex-col gap-2 pl-3 border-l-2 border-muted">
                  {cust.suppliers.map((sup) => {
                    const accentColor =
                      sup.status === 'missing-email'
                        ? 'border-l-red-400'
                        : sup.status === 'po-created'
                          ? 'border-l-green-500'
                          : 'border-l-amber-400';

                    return (
                      <Card
                        key={sup.name}
                        className={cn(
                          'py-0 gap-0 border-l-[3px] shadow-sm overflow-hidden',
                          accentColor,
                        )}
                      >
                        {/* Card header */}
                        <div className="flex items-start justify-between px-3 pt-2.5 pb-2 border-b">
                          <div>
                            <div className="text-[9px] font-semibold text-muted-foreground uppercase tracking-widest mb-1">
                              Purchase Order
                            </div>
                            <div className="text-[12px] font-semibold flex items-center gap-1.5">
                              {sup.name}
                              {sup.po ? (
                                <Badge variant="green">PO {sup.po}</Badge>
                              ) : (
                                <Badge variant="gray">{sup.itemCount} items</Badge>
                              )}
                            </div>
                            {sup.email && sup.status !== 'missing-email' && (
                              <div className="text-[10px] text-muted-foreground mt-0.5">
                                {sup.email}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0 mt-0.5">
                            {sup.status === 'missing-email' ? (
                              <>
                                <span className="text-[10px] text-red-700 font-medium">
                                  no email on file
                                </span>
                                <Btn variant="danger">+ Add email</Btn>
                                <Btn>Create PO</Btn>
                              </>
                            ) : sup.status === 'po-created' ? (
                              <>
                                <Btn>Print</Btn>
                                <Btn>Send email</Btn>
                                <Btn>Mark done</Btn>
                              </>
                            ) : (
                              <Btn>Create PO</Btn>
                            )}
                          </div>
                        </div>

                        {/* Card body — line items or note */}
                        {sup.items ? (
                          <div>
                            {sup.items.map((item) => (
                              <div
                                key={item.sku}
                                className="flex items-center gap-2 px-3 py-1.5 border-b last:border-b-0 text-[11px] text-muted-foreground"
                              >
                                <span className="font-mono text-[10px] text-foreground w-16 flex-shrink-0">
                                  {item.sku}
                                </span>
                                <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
                                  {item.name}
                                </span>
                                <span className="font-medium text-foreground min-w-7 text-right">
                                  ×{item.qty}
                                </span>
                                <Badge variant="gray">{item.price}</Badge>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="px-3 py-1.5 text-[10px] text-muted-foreground">
                            {sup.poNote ?? 'Click ▸ to expand items'}
                          </div>
                        )}
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })}

          <div className="h-3" />
        </div>

        {/* Right panel — Raw Shopify orders */}
        <div className="w-[272px] border-l bg-background flex flex-col flex-shrink-0">
          <div className="px-3.5 py-2.5 border-b text-[12px] font-medium text-muted-foreground flex items-center justify-between">
            <span>Raw Shopify orders</span>
            <span className="text-[10px] text-muted-foreground/60">
              {selectedSchedule ? selectedSchedule.label : 'all periods'}
            </span>
          </div>

          <div className="px-3.5 py-1.5 border-b">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="w-full text-[11px] px-2 py-1 border rounded-md bg-background text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          <div className="flex-1 overflow-y-auto">
            {filteredRawOrders.length === 0 ? (
              <p className="px-3.5 py-3 text-[11px] text-muted-foreground">No orders match.</p>
            ) : (
              filteredRawOrders.map((order) => {
                const isFaded =
                  activeOrders !== null && !activeOrders.includes(order.id);
                return (
                  <div
                    key={order.id}
                    className={cn(
                      'flex items-center gap-2 px-3.5 py-1.5 border-b text-[11px] cursor-pointer hover:bg-muted transition-opacity',
                      isFaded && 'opacity-25',
                    )}
                  >
                    <span className="font-mono text-[11px] font-medium min-w-[44px]">
                      #{order.id}
                    </span>
                    <span className="flex-1 text-muted-foreground overflow-hidden text-ellipsis whitespace-nowrap">
                      {order.customer}
                    </span>
                    <StatusBadge status={order.status} />
                  </div>
                );
              })
            )}
          </div>

          <div className="px-3.5 py-2 border-t text-[10px] text-muted-foreground/60">
            Click row to highlight in grouped view
          </div>
        </div>
      </div>

      {/* Status bar */}
      <div className="bg-background border-t px-5 py-2 flex items-center justify-between gap-3 text-[11px] text-muted-foreground flex-shrink-0">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
          Auto-schedule active · next run:{' '}
          <strong className="text-foreground">Apr 8, 09:00</strong>
        </div>
        <div className="flex items-center gap-2">
          <span>Period: weekly Mon–Sun</span>
          <span className="opacity-30">|</span>
          <span>Group: customer + vendor</span>
        </div>
        <Btn>Edit schedule</Btn>
      </div>
    </div>
  );
}
