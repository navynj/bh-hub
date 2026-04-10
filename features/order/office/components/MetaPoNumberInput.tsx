'use client';

import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils/cn';

export type MetaPoNumberFieldError = 'duplicate' | 'required' | null;

type Props = {
  value: string;
  onChange: (value: string) => void;
  error: MetaPoNumberFieldError;
  /** Inbox draft: muted text when using auto-derived number (not manually overridden). */
  muted?: boolean;
  placeholder?: string;
  disabled?: boolean;
};

export function MetaPoNumberInput({
  value,
  onChange,
  error,
  muted,
  placeholder = 'Auto',
  disabled,
}: Props) {
  return (
    <div className="flex flex-col gap-1">
      <Input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        error={error ? true : undefined}
        className={cn(
          'h-auto min-h-0 text-[11px] font-mono px-1.5 py-[4px] rounded-[5px] md:text-[11px]',
          muted && !error && 'text-muted-foreground',
          error && 'text-destructive placeholder:text-destructive/60',
        )}
      />
      {error === 'duplicate' && (
        <div className="text-[10px] text-[#A32D2D]">This PO number is already in use.</div>
      )}
      {error === 'required' && (
        <div className="text-[10px] text-[#A32D2D]">PO number is required.</div>
      )}
    </div>
  );
}
