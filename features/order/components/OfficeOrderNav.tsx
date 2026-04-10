'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const OFFICE_BASE = '/order/office';

const items: { href: string; label: string; match: (pathname: string) => boolean }[] =
  [
    {
      href: OFFICE_BASE,
      label: 'Order Inbox',
      match: (p) => p === OFFICE_BASE || p === `${OFFICE_BASE}/`,
    },
    {
      href: `${OFFICE_BASE}/purchase-orders`,
      label: 'Purchase Orders',
      match: (p) =>
        p === `${OFFICE_BASE}/purchase-orders` ||
        p.startsWith(`${OFFICE_BASE}/purchase-orders/`),
    },
    {
      href: `${OFFICE_BASE}/shopify-orders`,
      label: 'Shopify Orders',
      match: (p) =>
        p === `${OFFICE_BASE}/shopify-orders` ||
        p.startsWith(`${OFFICE_BASE}/shopify-orders/`),
    },
    {
      href: `${OFFICE_BASE}/schedule`,
      label: 'Schedule',
      match: (p) =>
        p === `${OFFICE_BASE}/schedule` ||
        p.startsWith(`${OFFICE_BASE}/schedule/`),
    },
    {
      href: `${OFFICE_BASE}/settings`,
      label: 'Settings',
      match: (p) =>
        p === `${OFFICE_BASE}/settings` ||
        p.startsWith(`${OFFICE_BASE}/settings/`),
    },
  ];

const OfficeOrderNav = () => {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col max-sm:flex-row flex-wrap gap-4 pb-2 mb-4 font-extrabold text-lg">
      {items.map(({ href, label, match }) => (
        <Link
          key={href}
          href={href}
          className={match(pathname) ? '' : 'text-gray-300'}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
};

export default OfficeOrderNav;
