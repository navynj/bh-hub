/**
 * Item enhancement: no-op when no Shopify config. Returns items with null unitPrice/amountPrice/gPrice.
 * Add Shopify integration later by replacing this with the full implementation from bh-cost-analysis.
 */

export interface ItemEnhancementResult {
  unitPrice: number | null;
  amountPrice: number | null;
  gPrice: number | null;
  metadata: unknown;
}

export interface EnhanceableItem {
  variantId: string;
  amount: number;
  unit: string;
  title?: string;
  type?: string;
}

export async function processItemsWithShopifyData<T extends EnhanceableItem>(
  items: T[],
  _shopifyConfig: unknown,
  _itemType: string
): Promise<(T & ItemEnhancementResult)[]> {
  return items.map((item) => ({
    ...item,
    unitPrice: null,
    amountPrice: null,
    gPrice: null,
    metadata: null,
  }));
}
