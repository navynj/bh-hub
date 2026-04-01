'use client';

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { CHART_COLORS } from '@/constants/color';
import { cn, formatCurrency } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';
import type { LaborCategoryItem } from '../../types';

type LaborCategoryListProps = {
  categories: LaborCategoryItem[];
  /** Expense D P&L total for % column; otherwise sum of category amounts. */
  totalLabor?: number;
};

export default function LaborCategoryList({
  categories,
  totalLabor,
}: LaborCategoryListProps) {
  if (categories.length === 0) return null;

  const sumCategories = categories.reduce((s, c) => s + c.amount, 0);
  const total =
    totalLabor != null && totalLabor > 0 ? totalLabor : sumCategories;

  return (
    <ul className="border-t pt-3 text-sm">
      {categories.map((c, index) => {
        const pct = total > 0 ? c.amount / total : 0;
        const color = CHART_COLORS[index % CHART_COLORS.length];
        const lines = c.lines ?? [];
        const hasDetail = lines.length > 0;

        const rowMain = (
          <>
            <span
              className="mt-0.5 h-2.5 w-2.5 shrink-0 rounded-[2px]"
              style={{ backgroundColor: color }}
            />
            <span className="min-w-0 flex-1 truncate font-medium">
              {c.name}
            </span>
            <span className="font-mono tabular-nums">
              {formatCurrency(c.amount)}
            </span>
            <span className="text-muted-foreground w-14 text-right tabular-nums">
              ({(pct * 100).toFixed(1)}%)
            </span>
          </>
        );

        if (!hasDetail) {
          return (
            <li
              key={c.id}
              className="flex items-center gap-2 border-b border-border/60 py-2 pl-7 last:border-b-0"
            >
              {rowMain}
            </li>
          );
        }

        return (
          <li
            key={c.id}
            className="border-b border-border/60 last:border-b-0"
          >
            <Collapsible>
              <CollapsibleTrigger
                type="button"
                className={cn(
                  'flex w-full items-center gap-2 py-2 text-left',
                  'hover:bg-muted/40 rounded-md -mx-1 px-1',
                  '[&[data-state=open]>svg]:rotate-180',
                )}
              >
                <ChevronDown
                  aria-hidden
                  className="size-4 shrink-0 text-muted-foreground transition-transform duration-200"
                />
                {rowMain}
              </CollapsibleTrigger>
              <CollapsibleContent>
                <ul
                  className="border-border/50 text-muted-foreground mb-2 ml-6 space-y-1 border-l pl-3 text-xs"
                  role="list"
                >
                  {lines.map((line) => (
                    <li
                      key={line.name}
                      className="flex items-start justify-between gap-3"
                    >
                      <span className="min-w-0 break-words font-normal">
                        {line.name}
                      </span>
                      <span className="shrink-0 font-mono tabular-nums">
                        {formatCurrency(line.amount)}
                      </span>
                    </li>
                  ))}
                </ul>
              </CollapsibleContent>
            </Collapsible>
          </li>
        );
      })}
    </ul>
  );
}
