import { Spinner } from '@/components/ui/spinner';

export default function OfficeOrderLoading() {
  return (
    <div className="flex flex-col border border-border rounded-xl overflow-hidden bg-background">
      <div className="h-[42px] border-b bg-muted/30 animate-pulse" />
      <div className="h-[36px] border-b bg-muted/20 animate-pulse" />

      <div className="flex min-h-[600px]">
        <div className="w-[248px] border-r flex-shrink-0">
          <div className="p-3 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-1.5">
                <div className="h-3 w-24 rounded bg-muted animate-pulse" />
                <div className="h-3 w-36 rounded bg-muted/60 animate-pulse" />
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <Spinner className="size-5" />
            <span className="text-xs">Loading orders…</span>
          </div>
        </div>
      </div>
    </div>
  );
}
