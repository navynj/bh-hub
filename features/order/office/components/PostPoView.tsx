import { Badge } from '@/components/ui/badge';
import { PoTable } from './PoTable';
import type { PostViewData } from '../types';

type Props = {
  viewData: PostViewData;
  selectedPoBlockId: string | null;
};

export function PostPoView({ viewData, selectedPoBlockId }: Props) {
  const pos = viewData.purchaseOrders;
  const hasMulti = pos.length > 1;

  const visiblePos = hasMulti
    ? pos.filter((po) => po.id === (selectedPoBlockId ?? pos[0].id))
    : pos;

  return (
    <div>
      {(viewData.label || viewData.extraLabel) && (
        <div className="flex items-center gap-1.5 mb-2.5">
          {viewData.label && (
            <Badge variant="blue" className="rounded px-1.5 text-[10px]">
              {viewData.label}
            </Badge>
          )}
          {viewData.extraLabel && (
            <span className="text-[10px] text-muted-foreground">
              {viewData.extraLabel}
            </span>
          )}
        </div>
      )}
      {visiblePos.map((po) => (
        <PoTable key={po.id} purchaseOrder={po} />
      ))}
    </div>
  );
}
