'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

const DEFAULT_REF_MONTHS = 12;
const MIN_REF = 0;
const MAX_REF = 24;

type UpdateRevenueTargetDialogProps = {
  locationId: string;
  /** Dashboard month (YYYY-MM) this configuration applies to. */
  appliesYearMonth: string;
  /** Current saved value from DB — pre-populates the input immediately on open. */
  initialRefMonths?: number | null;
};

export default function UpdateRevenueTargetDialog({
  locationId,
  appliesYearMonth,
  initialRefMonths,
}: UpdateRevenueTargetDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refMonths, setRefMonths] = useState(
    initialRefMonths != null ? String(initialRefMonths) : String(DEFAULT_REF_MONTHS),
  );

  const load = useCallback(async () => {
    const q = new URLSearchParams({ yearMonth: appliesYearMonth });
    const res = await fetch(
      `/api/dashboard/revenue-target/${locationId}?${q.toString()}`,
    );
    const j = (await res.json()) as {
      ok?: boolean;
      referencePeriodMonths?: number | null;
    };
    if (res.ok && j.ok) {
      if (
        j.referencePeriodMonths != null &&
        Number.isFinite(j.referencePeriodMonths)
      ) {
        setRefMonths(String(j.referencePeriodMonths));
      } else {
        setRefMonths(String(DEFAULT_REF_MONTHS));
      }
    }
  }, [locationId, appliesYearMonth]);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  const onSave = async () => {
    const n = Number.parseInt(refMonths, 10);
    if (!Number.isFinite(n) || n < MIN_REF || n > MAX_REF) {
      toast.error(
        `Reference months must be ${MIN_REF}–${MAX_REF} (0 = no target)`,
      );
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/dashboard/revenue-target/${locationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appliesYearMonth,
          referencePeriodMonths: n,
        }),
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast.error(j.error ?? 'Save failed');
        return;
      }
      toast.success('Clover mix updated');
      setOpen(false);
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="shrink-0">
          Update Target
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Clover day mix — {appliesYearMonth}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2 text-sm">
          <p className="text-muted-foreground">
            Sets the weekday / BC holiday mix for dashboard month{' '}
            <strong>{appliesYearMonth}</strong> only. The{' '}
            <span className="text-foreground">annual revenue goal</span> is
            configured separately via{' '}
            <span className="text-foreground">Annual goal</span>.
          </p>
          <p className="text-muted-foreground">
            <span className="text-foreground">Reference period (months)</span>:
            Clover net sales (pre-tax, pre-tip) for that many{' '}
            <em>full calendar months</em> immediately before{' '}
            <strong>{appliesYearMonth}</strong> (that month excluded; Vancouver
            dates), same idea as budget reference months. That mix spreads the
            annual goal into per-day targets for Remaining / Over on the charts.{' '}
            <strong>0</strong> means no Clover mix — no day/week targets from
            this row (annual goal alone does not show Remaining/Over without a
            mix).
          </p>
          <div className="space-y-2">
            <Label htmlFor="ref-months">Reference period (months)</Label>
            <p className="text-xs text-muted-foreground">
              {MIN_REF}–{MAX_REF} ({MIN_REF} = no target). Default when unset:{' '}
              {DEFAULT_REF_MONTHS}.
            </p>
            <Input
              id="ref-months"
              inputMode="numeric"
              value={refMonths}
              onChange={(e) => setRefMonths(e.target.value.replace(/\D/g, ''))}
              placeholder={String(DEFAULT_REF_MONTHS)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={() => void onSave()} disabled={loading}>
            {loading ? 'Saving…' : 'Save & recompute'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
