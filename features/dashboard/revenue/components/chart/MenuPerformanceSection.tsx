'use client';

import { cn, formatCurrency } from '@/lib/utils';
import { useState } from 'react';
import type { CloverMenuItemStat } from '../types';

type Tab = 'top' | 'bottom' | 'seasonal';

type MenuPerformanceSectionProps = {
  topMenuItems: CloverMenuItemStat[];
  bottomMenuItems: CloverMenuItemStat[];
  seasonalMenuItems: CloverMenuItemStat[] | undefined;
};

function MenuItemRow({ item, rank }: { item: CloverMenuItemStat; rank?: number }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 text-sm">
      {rank != null && (
        <span className="w-5 shrink-0 text-xs text-muted-foreground tabular-nums text-right">
          {rank}
        </span>
      )}
      <span className="min-w-0 flex-1 truncate" title={item.name}>
        {item.name}
      </span>
      <span className="shrink-0 tabular-nums text-muted-foreground text-xs">
        ×{item.quantity % 1 === 0 ? item.quantity.toFixed(0) : item.quantity.toFixed(1)}
      </span>
      <span className="shrink-0 w-20 text-right tabular-nums font-medium">
        {formatCurrency(item.revenue)}
      </span>
      <span className="shrink-0 w-12 text-right text-xs text-muted-foreground tabular-nums">
        {item.revenuePercent > 0 ? `${item.revenuePercent.toFixed(1)}%` : ''}
      </span>
    </div>
  );
}

const TABS: { id: Tab; label: string }[] = [
  { id: 'top', label: 'Top 10' },
  { id: 'bottom', label: 'Low 10' },
  { id: 'seasonal', label: 'Special' },
];

export default function MenuPerformanceSection({
  topMenuItems,
  bottomMenuItems,
  seasonalMenuItems,
}: MenuPerformanceSectionProps) {
  const [activeTab, setActiveTab] = useState<Tab>('top');

  const visibleTabs = TABS.filter(
    (t) => t.id !== 'seasonal' || seasonalMenuItems !== undefined,
  );

  const items: CloverMenuItemStat[] =
    activeTab === 'top'
      ? topMenuItems
      : activeTab === 'bottom'
        ? bottomMenuItems
        : (seasonalMenuItems ?? []);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">Menu Performance</span>
        <div className="flex gap-1 rounded-md border p-0.5">
          {visibleTabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className={cn(
                'rounded px-2.5 py-0.5 text-xs font-medium transition-colors',
                activeTab === t.id
                  ? 'bg-foreground text-background'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="divide-y rounded-lg border">
        {/* Header */}
        <div className="flex items-center gap-2 px-3 py-1.5 text-xs text-muted-foreground bg-muted/30 rounded-t-lg">
          <span className="w-5 shrink-0" />
          <span className="flex-1">Item</span>
          <span className="shrink-0 w-8 text-right">Qty</span>
          <span className="shrink-0 w-20 text-right">Revenue</span>
          <span className="shrink-0 w-12 text-right">%</span>
        </div>
        {items.length === 0 ? (
          <p className="px-3 py-4 text-sm text-center text-muted-foreground">
            {activeTab === 'seasonal'
              ? 'No special menu items found for this week.'
              : 'No data available.'}
          </p>
        ) : (
          items.map((item, i) => (
            <MenuItemRow
              key={item.itemId ?? item.name}
              item={item}
              rank={activeTab !== 'seasonal' ? i + 1 : undefined}
            />
          ))
        )}
      </div>
    </div>
  );
}
