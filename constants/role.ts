import type { UserRole } from '@/types/user';
import { USER_ROLES } from '@/types/user';

export const ROLES: { value: UserRole; label: string }[] = USER_ROLES.map(
  (role) => ({
    value: role,
    label: role,
  }),
);
