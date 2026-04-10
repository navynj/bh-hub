import { createAdminApiClient } from '@shopify/admin-api-client';
import { formatShopifyAdminClientErrors } from '@/lib/shopify/format-admin-api-errors';
import type { ShopifyAdminCredentials, ShopifyMailingAddress } from '@/types/shopify';

const CUSTOMERS_QUERY = `query Customers($first: Int!, $after: String, $query: String) {
  customers(first: $first, after: $after, query: $query) {
    pageInfo {
      hasNextPage
      endCursor
    }
    edges {
      cursor
      node {
        id
        displayName
        firstName
        lastName
        email
        phone
        defaultAddress {
          address1
          address2
          city
          province
          country
          zip
          company
          name
          phone
        }
        addressesV2(first: 1) {
          edges {
            node {
              address1
              address2
              city
              province
              country
              zip
              company
              name
              phone
            }
          }
        }
      }
    }
  }
}`;

export type ShopifyAdminCustomerNode = {
  id: string;
  displayName: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  defaultAddress: ShopifyMailingAddress | null;
  /** When `defaultAddress` is unset, Shopify may still store address(es) here. */
  addressesV2?: { edges: Array<{ node: ShopifyMailingAddress }> } | null;
};

type CustomersQueryData = {
  customers: {
    pageInfo: { hasNextPage: boolean; endCursor: string | null };
    edges: Array<{ cursor: string; node: ShopifyAdminCustomerNode }>;
  };
};

export type FetchShopifyCustomersPageOptions = {
  first?: number;
  after?: string | null;
  query?: string;
};

export async function fetchShopifyCustomersPage(
  creds: ShopifyAdminCredentials,
  options: FetchShopifyCustomersPageOptions = {},
): Promise<CustomersQueryData> {
  const { first = 50, after, query } = options;
  const client = createAdminApiClient({
    storeDomain: creds.shopDomain.replace(/^https?:\/\//, '').replace(/\/$/, ''),
    apiVersion: creds.apiVersion,
    accessToken: creds.accessToken,
  });

  const { data, errors } = await client.request<CustomersQueryData>(CUSTOMERS_QUERY, {
    variables: { first, after: after ?? undefined, query: query ?? undefined },
  });

  const errText = formatShopifyAdminClientErrors(errors);
  if (errText) {
    throw new Error(`Shopify customers query failed: ${errText}`);
  }

  if (!data?.customers) {
    throw new Error('Shopify customers query returned no data');
  }

  return data;
}

export type FetchAllShopifyCustomersOptions = {
  pageSize?: number;
  maxPages?: number;
  query?: string;
  signal?: AbortSignal;
  onPage?: (info: { pageIndex: number; cumulativeCustomers: number }) => void | Promise<void>;
};

/**
 * Paginated customers list (same `query` search syntax as Admin API, e.g. `updated_at:>'...'`).
 * Uses `addressesV2` (connection); legacy `addresses` is not a connection in current Admin API.
 */
export async function fetchAllShopifyCustomers(
  creds: ShopifyAdminCredentials,
  options: FetchAllShopifyCustomersOptions = {},
): Promise<{ customers: ShopifyAdminCustomerNode[]; pagesFetched: number }> {
  const pageSize = options.pageSize ?? 50;
  const maxPages = options.maxPages ?? 20;
  const query = options.query;
  const signal = options.signal;
  const onPage = options.onPage;
  let after: string | null = null;
  const customers: ShopifyAdminCustomerNode[] = [];
  let pagesFetched = 0;

  while (pagesFetched < maxPages) {
    if (signal?.aborted) {
      throw new DOMException('Shopify customers fetch aborted', 'AbortError');
    }
    const data = await fetchShopifyCustomersPage(creds, { first: pageSize, after, query });
    for (const edge of data.customers.edges) {
      customers.push(edge.node);
    }
    pagesFetched += 1;
    await onPage?.({ pageIndex: pagesFetched, cumulativeCustomers: customers.length });
    if (!data.customers.pageInfo.hasNextPage || !data.customers.pageInfo.endCursor) {
      break;
    }
    after = data.customers.pageInfo.endCursor;
  }

  return { customers, pagesFetched };
}
