import type { ShopifyAdminCredentials } from '@/types/shopify';

/**
 * Single-store Admin API credentials from the environment.
 * Set `SHOPIFY_SHOP_DOMAIN`, `SHOPIFY_ADMIN_TOKEN`; optional `SHOPIFY_API_VERSION` (default 2024-10).
 * Distinct from `cost.shopify_config`, which remains for cost-module DB-backed config.
 */

const DEFAULT_API_VERSION = '2024-10';

export function isShopifyAdminEnvConfigured(): boolean {
  const domain = process.env.SHOPIFY_SHOP_DOMAIN?.trim();
  const token = process.env.SHOPIFY_ADMIN_TOKEN?.trim();
  return Boolean(domain && token);
}

/**
 * @throws If `SHOPIFY_SHOP_DOMAIN` or `SHOPIFY_ADMIN_TOKEN` is missing.
 */
export function getShopifyAdminEnv(): ShopifyAdminCredentials {
  const shopDomain = process.env.SHOPIFY_SHOP_DOMAIN?.trim();
  const accessToken = process.env.SHOPIFY_ADMIN_TOKEN?.trim();
  const apiVersion =
    process.env.SHOPIFY_API_VERSION?.trim() || DEFAULT_API_VERSION;

  if (!shopDomain || !accessToken) {
    throw new Error(
      'Missing SHOPIFY_SHOP_DOMAIN or SHOPIFY_ADMIN_TOKEN in environment',
    );
  }

  return { shopDomain, accessToken, apiVersion };
}
