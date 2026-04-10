import { OrderBlock } from './OrderBlock';
import type { PreViewData } from '../types';

export type SeparatePoPayload = {
  expectedDate: string | null;
  comment: string | null;
  shopifyOrderNumber: string;
  lineItems: {
    sku: string | null;
    productTitle: string;
    quantity: number;
    itemPrice: number | null;
  }[];
};

type Props = {
  viewData: PreViewData;
  inclusions?: Record<string, boolean[]>;
  onToggleInclude?: (orderId: string, itemIdx: number) => void;
  onSeparatePo?: (payload: SeparatePoPayload) => void;
  onArchive?: () => void;
  /** When editing drafts under a PO tab, pass PO id for Shopify save + resync. */
  purchaseOrderId?: string | null;
};

export function PrePoView({
  viewData,
  inclusions,
  onToggleInclude,
  onSeparatePo,
  onArchive,
  purchaseOrderId,
}: Props) {
  return (
    <div>
      {viewData.shopifyOrderDrafts.map((order) => (
        <OrderBlock
          key={order.id}
          order={order}
          inclusions={inclusions?.[order.id]}
          onToggleInclude={onToggleInclude}
          onSeparatePo={onSeparatePo}
          onArchive={onArchive}
          purchaseOrderId={purchaseOrderId ?? undefined}
        />
      ))}
    </div>
  );
}
