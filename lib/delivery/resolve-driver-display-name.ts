/**
 * Driver.name is an optional office override; when null, use linked public.User.name.
 */
export function resolveDriverDisplayName(driver: {
  name: string | null;
  user?: { name: string | null } | null;
}): string | null {
  const override = driver.name?.trim();
  if (override) return override;
  return driver.user?.name?.trim() ?? null;
}

/** Schedule list/detail shape: coalesce driver override + public user name. */
export function toDriverScheduleApiShape(driver: {
  id: string;
  userId: string;
  name: string | null;
  user?: { name: string | null } | null;
}): { id: string; userId: string; name: string | null } {
  return {
    id: driver.id,
    userId: driver.userId,
    name: resolveDriverDisplayName(driver),
  };
}
