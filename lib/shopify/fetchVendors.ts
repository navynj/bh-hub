import { createAdminApiClient } from '@shopify/admin-api-client';
import { getShopifyAdminEnv } from '@/lib/shopify/env';
import type { ShopifyAdminCredentials } from '@/types/shopify';

const VENDORS_QUERY = `query ProductVendors($first: Int!) {
  shop {
    productVendors(first: $first) {
      edges {
        node
      }
    }
  }
}`;

type VendorsQueryData = {
  shop: {
    productVendors: {
      edges: Array<{ node: string }>;
    };
  };
};

/**
 * Fetch distinct product vendor names from the Shopify Admin GraphQL API.
 * Returns a sorted array of non-empty vendor strings.
 */
export async function fetchShopifyVendors(
  creds: ShopifyAdminCredentials,
  first = 250,
): Promise<string[]> {
  const client = createAdminApiClient({
    storeDomain: creds.shopDomain.replace(/^https?:\/\//, '').replace(/\/$/, ''),
    apiVersion: creds.apiVersion,
    accessToken: creds.accessToken,
  });

  const { data, errors } = await client.request<VendorsQueryData>(
    VENDORS_QUERY,
    { variables: { first } },
  );

  const errList = Array.isArray(errors) ? errors : errors ? [errors] : [];
  if (errList.length > 0) {
    const msg = errList
      .map((e) =>
        e && typeof e === 'object' && 'message' in e
          ? String((e as { message?: string }).message)
          : String(e),
      )
      .join('; ');
    throw new Error(`Shopify productVendors query failed: ${msg}`);
  }

  if (!data?.shop?.productVendors) {
    throw new Error('Shopify productVendors query returned no data');
  }

  return data.shop.productVendors.edges
    .map((e) => e.node)
    .filter((v) => v.trim() !== '')
    .sort((a, b) => a.localeCompare(b));
}

/** Fetch vendors using env credentials (`SHOPIFY_*`). */
export function fetchShopifyVendorsFromEnv(first?: number) {
  return fetchShopifyVendors(getShopifyAdminEnv(), first);
}
