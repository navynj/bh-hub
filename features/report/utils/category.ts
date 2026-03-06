/** Path from root: leading numeric segments after "qb" (e.g. qb-0-0-0 → [0,0,0], qb-0-COS1 → [0]). */
export function parseCategoryPath(categoryId: string): number[] {
  const parts = categoryId.split('-');
  if (parts.length < 2 || parts[0] !== 'qb') return [];
  const path: number[] = [];
  for (let i = 1; i < parts.length; i++) {
    if (/^\d+$/.test(parts[i])) path.push(parseInt(parts[i], 10));
    else break;
  }
  return path;
}

export const isTopLevelCategory = (categoryId: string) =>
  parseCategoryPath(categoryId).length === 1;

export const getTopLevelCategoryIndex = (categoryId: string): number => {
  const path = parseCategoryPath(categoryId);
  if (path.length === 0) return Number.MAX_SAFE_INTEGER;
  return path[0] ?? Number.MAX_SAFE_INTEGER;
};

/** Derive top-level display name from subcategory name (e.g. "MAIN - COS3" → "MAIN"). */
function topLevelNameFromSub(name: string): string {
  const i = name.indexOf(' - ');
  return i > 0 ? name.slice(0, i).trim() : name;
}

export const getTopLevelCategories = (
  categories: { categoryId: string; name: string; amount: number }[],
) => {
  if (!categories?.length) return [];
  const byTopIdx = new Map<
    number,
    { name: string; cos: number; fromTopLevel: boolean }
  >();
  for (const c of categories) {
    const path = parseCategoryPath(c.categoryId);
    if (path.length === 0) continue;
    const topIdx = path[0];
    const amount = Number.isFinite(c.amount) ? c.amount : 0;
    const existing = byTopIdx.get(topIdx);
    if (path.length === 1) {
      byTopIdx.set(topIdx, {
        name: c.name,
        cos: existing ? existing.cos + amount : amount,
        fromTopLevel: true,
      });
    } else {
      const name =
        existing?.fromTopLevel
          ? existing.name
          : existing?.name ?? topLevelNameFromSub(c.name);
      byTopIdx.set(topIdx, {
        name,
        cos: (existing?.cos ?? 0) + amount,
        fromTopLevel: existing?.fromTopLevel ?? false,
      });
    }
  }
  return [...byTopIdx.entries()]
    .sort(([a], [b]) => a - b)
    .map(([, v]) => ({ category: v.name, cos: v.cos }));
};
