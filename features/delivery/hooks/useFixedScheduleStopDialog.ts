'use client';

import { useCallback, useState } from 'react';

export function useFixedScheduleStopDialog() {
  const [open, setOpen] = useState(false);
  const [stopIndex, setStopIndex] = useState<number>(-1);
  const [insertIndex, setInsertIndex] = useState<number | null>(null);

  const openEdit = useCallback((idx: number) => {
    setStopIndex(idx);
    setInsertIndex(null);
    setOpen(true);
  }, []);

  const openAdd = useCallback((atIndex?: number) => {
    setStopIndex(-1);
    setInsertIndex(atIndex ?? null);
    setOpen(true);
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    setStopIndex(-1);
    setInsertIndex(null);
  }, []);

  return {
    open,
    stopIndex,
    insertIndex,
    openEdit,
    openAdd,
    close,
  };
}
