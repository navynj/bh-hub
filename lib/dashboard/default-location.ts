import { prisma } from '@/lib/core';

/** Oldest `showBudget` location, else oldest any location (by `createdAt`). */
export async function getDefaultDashboardLocationId(): Promise<string | null> {
  let location = await prisma.location.findFirst({
    where: { showBudget: true },
    orderBy: { createdAt: 'asc' },
  });
  if (!location) {
    location = await prisma.location.findFirst({
      orderBy: { createdAt: 'asc' },
    });
  }
  return location?.id ?? null;
}

/** Rewrite legacy `/dashboard/cost` URLs (e.g. OAuth `returnTo`) to `/dashboard/location/[id]`. */
export async function mapLegacyDashboardCostPath(path: string): Promise<string> {
  const qIdx = path.indexOf('?');
  const pathname = qIdx >= 0 ? path.slice(0, qIdx) : path;
  const search = qIdx >= 0 ? path.slice(qIdx) : '';
  if (pathname === '/dashboard/cost') {
    const id = await getDefaultDashboardLocationId();
    return id ? `/dashboard/location/${id}${search}` : `/dashboard${search}`;
  }
  const m = pathname.match(/^\/dashboard\/cost\/location\/([^/]+)$/);
  if (m) {
    return `/dashboard/location/${m[1]}${search}`;
  }
  return path;
}
