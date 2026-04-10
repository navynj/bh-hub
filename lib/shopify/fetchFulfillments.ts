/**
 * Build a lookup from Shopify order name (e.g. "#5362") to its
 * `displayFulfillmentStatus`. Used by the office inbox to derive
 * fulfillment counts at the Shopify-order level rather than
 * PO-line-item level.
 */

import type {
  ShopifyOrderNode,
  ShopifyOrderDisplayFulfillmentStatus,
} from '@/types/shopify';

export type ShopifyOrderStatusMap = Record<
  string,
  ShopifyOrderDisplayFulfillmentStatus
>;

export function buildShopifyOrderStatusMap(
  shopifyOrders: ShopifyOrderNode[],
): ShopifyOrderStatusMap {
  const map: ShopifyOrderStatusMap = {};
  for (const o of shopifyOrders) {
    if (o.name && o.displayFulfillmentStatus) {
      map[o.name] = o.displayFulfillmentStatus;
      const alt = o.name.startsWith('#')
        ? o.name.slice(1)
        : `#${o.name}`;
      if (!(alt in map)) map[alt] = o.displayFulfillmentStatus;
    }
  }
  return map;
}
