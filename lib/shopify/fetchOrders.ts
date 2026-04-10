import { createAdminApiClient } from '@shopify/admin-api-client';
import { getShopifyAdminEnv } from '@/lib/shopify/env';
import type {
  ShopifyAdminCredentials,
  ShopifyOrderNode,
  ShopifyOrdersQueryData,
} from '@/types/shopify';

const ORDERS_QUERY = `query Orders($first: Int!, $after: String) {
  orders(first: $first, after: $after, sortKey: CREATED_AT, reverse: true) {
    pageInfo {
      hasNextPage
      endCursor
    }
    edges {
      cursor
      node {
        id
        name
        email
        customer {
          id
          displayName
          firstName
          lastName
          email
          phone
        }
        processedAt
        createdAt
        displayFinancialStatus
        displayFulfillmentStatus
        currencyCode
        totalPriceSet {
          shopMoney {
            amount
            currencyCode
          }
        }
        lineItems(first: 250) {
          edges {
            node {
              id
              title
              quantity
              sku
              variant {
                id
                title
                sku
              }
            }
          }
        }
      }
    }
  }
}`;

export type FetchShopifyOrdersPageOptions = {
  first?: number;
  after?: string | null;
};

/**
 * Fetches one page of orders from Shopify Admin GraphQL API.
 */
export async function fetchShopifyOrdersPage(
  creds: ShopifyAdminCredentials,
  options: FetchShopifyOrdersPageOptions = {}
): Promise<ShopifyOrdersQueryData> {
  const { first = 25, after } = options;
  const client = createAdminApiClient({
    storeDomain: creds.shopDomain.replace(/^https?:\/\//, '').replace(/\/$/, ''),
    apiVersion: creds.apiVersion,
    accessToken: creds.accessToken,
  });

  const { data, errors } = await client.request<ShopifyOrdersQueryData>(ORDERS_QUERY, {
    variables: { first, after: after ?? undefined },
  });

  const errList = Array.isArray(errors) ? errors : errors ? [errors] : [];
  if (errList.length > 0) {
    const msg = errList
      .map((e) => (e && typeof e === 'object' && 'message' in e ? String((e as { message?: string }).message) : String(e)))
      .join('; ');
    throw new Error(`Shopify orders query failed: ${msg}`);
  }

  if (!data?.orders) {
    throw new Error('Shopify orders query returned no data');
  }

  return data;
}

export type FetchAllShopifyOrdersOptions = {
  pageSize?: number;
  /** Safety cap on GraphQL pages (default 100). */
  maxPages?: number;
};

/**
 * Paginates in memory (no DB): current Shopify order list, up to `maxPages` × `pageSize` rows.
 */
export async function fetchAllShopifyOrders(
  creds: ShopifyAdminCredentials,
  options: FetchAllShopifyOrdersOptions = {}
): Promise<{ orders: ShopifyOrderNode[]; pagesFetched: number }> {
  const pageSize = options.pageSize ?? 50;
  const maxPages = options.maxPages ?? 100;
  let after: string | null = null;
  const orders: ShopifyOrderNode[] = [];
  let pagesFetched = 0;

  while (pagesFetched < maxPages) {
    const data = await fetchShopifyOrdersPage(creds, { first: pageSize, after });
    for (const edge of data.orders.edges) {
      orders.push(edge.node);
    }
    pagesFetched += 1;
    if (!data.orders.pageInfo.hasNextPage || !data.orders.pageInfo.endCursor) {
      break;
    }
    after = data.orders.pageInfo.endCursor;
  }

  return { orders, pagesFetched };
}

/** One page of orders using `SHOPIFY_SHOP_DOMAIN` / `SHOPIFY_ADMIN_TOKEN` / `SHOPIFY_API_VERSION`. */
export function fetchShopifyOrdersPageFromEnv(
  options: FetchShopifyOrdersPageOptions = {},
) {
  return fetchShopifyOrdersPage(getShopifyAdminEnv(), options);
}

/** All pages (in memory) using env credentials. */
export function fetchAllShopifyOrdersFromEnv(
  options: FetchAllShopifyOrdersOptions = {},
) {
  return fetchAllShopifyOrders(getShopifyAdminEnv(), options);
}
