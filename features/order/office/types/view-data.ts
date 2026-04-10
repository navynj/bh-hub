import type { OfficePurchaseOrderBlock } from './purchase-order';
import type { ShopifyOrderDraft } from './shopify-draft';

export type PreViewData = {
  type: 'pre';
  shopifyOrderDrafts: ShopifyOrderDraft[];
};

export type PostViewData = {
  type: 'post';
  label?: string;
  extraLabel?: string;
  purchaseOrders: OfficePurchaseOrderBlock[];
  /** Without-PO Shopify order drafts for the same supplier (via vendor mapping). */
  shopifyOrderDrafts?: ShopifyOrderDraft[];
  subtreeParentLabel?: string;
  multiPoSubtree?: boolean;
};

export type ViewData = PreViewData | PostViewData;
