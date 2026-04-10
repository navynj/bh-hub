import { cloverFetch } from './clover-fetch';
import { getCloverApiBaseUrl } from './config';

export type CloverCategory = {
  id: string;
  name: string;
};

type CategoriesResponse = { elements?: { id?: string; name?: string }[] };
type ItemsResponse = { elements?: { id?: string }[] };

/** Returns all menu categories for the merchant. */
export async function fetchCloverCategories(
  merchantId: string,
  token: string,
): Promise<CloverCategory[]> {
  const base = getCloverApiBaseUrl();
  const url = `${base}/v3/merchants/${merchantId}/categories?limit=200`;
  const res = await cloverFetch(url, token);
  if (!res.ok) return [];
  const json = (await res.json()) as CategoriesResponse;
  return (json.elements ?? [])
    .filter((c): c is { id: string; name: string } => !!c.id && !!c.name)
    .map((c) => ({ id: c.id, name: c.name }));
}

/** Returns item IDs that belong to the given category. */
export async function fetchCloverItemIdsByCategory(
  merchantId: string,
  token: string,
  categoryId: string,
): Promise<string[]> {
  const base = getCloverApiBaseUrl();
  const url = `${base}/v3/merchants/${merchantId}/categories/${categoryId}/items?limit=1000`;
  const res = await cloverFetch(url, token);
  if (!res.ok) return [];
  const json = (await res.json()) as ItemsResponse;
  return (json.elements ?? []).map((i) => i.id ?? '').filter(Boolean);
}

/**
 * Case-insensitive names that indicate a seasonal/special category.
 * Match any category whose name contains one of these terms.
 */
const SEASONAL_KEYWORDS = /special|seasonal|limited|lto|feature/i;

export function findSeasonalCategory(
  categories: CloverCategory[],
): CloverCategory | undefined {
  return categories.find((c) => SEASONAL_KEYWORDS.test(c.name));
}
