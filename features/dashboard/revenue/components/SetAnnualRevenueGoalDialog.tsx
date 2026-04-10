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

type SetAnnualRevenueGoalDialogProps = {
  locationId: string;
  /** Dashboard month YYYY-MM — calendar year is taken from the first four characters. */
  appliesYearMonth: string;
  /** Button label. Defaults to "Annual goal". */
  label?: string;
  /** Current saved annual goal from DB — pre-populates the input immediately on open. */
  initialGoal?: number | null;
};

export default function SetAnnualRevenueGoalDialog({
  locationId,
  appliesYearMonth,
  label = 'Annual goal',
  initialGoal,
}: SetAnnualRevenueGoalDialogProps) {
  const router = useRouter();
  const calendarYear = Number.parseInt(appliesYearMonth.slice(0, 4), 10);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [goal, setGoal] = useState(
    initialGoal != null && initialGoal > 0 ? String(initialGoal) : '',
  );

  const load = useCallback(async () => {
    if (!Number.isFinite(calendarYear)) return;
    const q = new URLSearchParams({ calendarYear: String(calendarYear) });
    const res = await fetch(
      `/api/dashboard/revenue-target/${locationId}/annual?${q.toString()}`,
    );
    const j = (await res.json()) as {
      ok?: boolean;
      goalAmount?: number | null;
    };
    if (res.ok && j.ok) {
      if (j.goalAmount != null && Number.isFinite(j.goalAmount)) {
        setGoal(String(j.goalAmount));
      } else {
        setGoal('');
      }
    }
  }, [locationId, calendarYear]);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  const onSave = async () => {
    const amount = Number.parseFloat(goal.replace(/,/g, ''));
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error('Enter a positive annual goal');
      return;
    }
    if (!Number.isFinite(calendarYear)) {
      toast.error('Invalid dashboard month');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `/api/dashboard/revenue-target/${locationId}/annual`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ calendarYear, goalAmount: amount }),
        },
      );
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast.error(j.error ?? 'Save failed');
        return;
      }
      toast.success('Annual revenue goal saved');
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
          {label}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Annual revenue goal — {calendarYear}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2 text-sm">
          <p className="text-muted-foreground">
            Sets the calendar-year goal for this location. Day/week/month Clover
            targets use this amount together with the mix from{' '}
            <span className="text-foreground">Update Target</span> (reference period
            in months + Clover recompute). If no annual goal is set, those targets
            stay off until you set one here.
          </p>
          <div className="space-y-2">
            <Label htmlFor="annual-goal-only">Goal (dollars)</Label>
            <Input
              id="annual-goal-only"
              inputMode="decimal"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="e.g. 1200000"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={() => void onSave()} disabled={loading}>
            {loading ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
