/**
 * Shopify API types (hub: no organizationId on config)
 */
export interface ShopifyConfig {
  id: string;
  shopifyUrl: string;
  adminToken: string;
  apiVersion: string;
  query: string | null;
}

export interface ProductMetadata {
  unit?: string;
  split_unit?: number;
  pak_unit?: number;
  g_per_pc?: number;
  [key: string]: unknown;
}

export interface ProductImage {
  alt: string;
  src: string;
}

export interface ShopifyProductVariant {
  id: string;
  title: string;
  inventoryItem?: {
    unitCost?: { amount: string };
  };
}

export interface ShopifyProduct {
  id: string;
  handle: string;
  title: string;
  productType?: string;
  status: string;
  vendor?: string;
  price?: string | number;
  variantId?: string;
  metadata?: ProductMetadata;
  thumbnail?: ProductImage;
  thumbnails?: ProductImage[];
  variants?: { nodes: ShopifyProductVariant[] };
  media?: {
    nodes: Array<{
      preview?: { image?: { altText?: string; url: string } };
    }>;
  };
  metafield?: { jsonValue?: string[] };
  unitPrice?: number;
  gPrice?: number | null;
  active?: boolean;
}

export interface ShopifyMetaobjectField {
  key: string;
  value: string;
  type: string;
}

export interface ShopifyMetaobjectResponse {
  metaobject: { fields: ShopifyMetaobjectField[] };
}

/** Credentials for Admin API (GraphQL) — env: `SHOPIFY_*` or passed explicitly. */
export interface ShopifyAdminCredentials {
  shopDomain: string;
  accessToken: string;
  apiVersion: string;
}

/** GraphQL `orders` query page (Admin API). */
export interface ShopifyOrdersPageInfo {
  hasNextPage: boolean;
  endCursor: string | null;
}

export interface ShopifyOrderLineNode {
  id: string;
  title: string;
  quantity: number;
  sku: string | null;
  variant: { id: string; title: string | null; sku: string | null } | null;
}

/** Order.customer (null for some guest checkouts). */
export interface ShopifyOrderCustomer {
  id: string;
  displayName: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
}

export interface ShopifyOrderNode {
  id: string;
  name: string | null;
  email: string | null;
  customer: ShopifyOrderCustomer | null;
  processedAt: string | null;
  createdAt: string;
  displayFinancialStatus: string | null;
  displayFulfillmentStatus: string | null;
  currencyCode: string;
  totalPriceSet: {
    shopMoney: { amount: string; currencyCode: string };
  };
  lineItems: {
    edges: Array<{ node: ShopifyOrderLineNode }>;
  };
}

export interface ShopifyOrdersQueryData {
  orders: {
    edges: Array<{ cursor: string; node: ShopifyOrderNode }>;
    pageInfo: ShopifyOrdersPageInfo;
  };
}
