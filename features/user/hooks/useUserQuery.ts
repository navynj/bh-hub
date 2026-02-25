'use client';

import { useSession } from 'next-auth/react';

/** Current session user with optional organization id (from locationId) for cost/ingredient flows. */
export type UserQueryUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  organization?: { id: string };
};

/**
 * Returns the current session user. Uses next-auth useSession under the hood.
 * Requires SessionProvider to be mounted (e.g. in root layout).
 */
export function useUserQuery(): { data: UserQueryUser | undefined } {
  const { data: session, status } = useSession();
  const user = session?.user;
  if (status === 'loading' || !user) {
    return { data: undefined };
  }
  const locationId = user.locationId ?? undefined;
  return {
    data: {
      id: user.id,
      name: user.name ?? null,
      email: user.email ?? null,
      ...(locationId && { organization: { id: locationId } }),
    },
  };
}
