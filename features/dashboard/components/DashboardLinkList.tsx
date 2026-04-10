'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';

const DashboardLinkList = () => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryString = searchParams?.toString()
    ? '?' + searchParams.toString()
    : '';
  const linkClass = (path: string) =>
    pathname === path || pathname.startsWith(path + '/') ? '' : 'text-gray-300';
  const costPathActive =
    pathname === '/dashboard' ||
    pathname.startsWith('/dashboard/location/');
  return (
    <>
      {/* <Link
        href={`/dashboard/revenue${queryString}`}
        className={linkClass('/dashboard/revenue')}
      >
        Revenue
      </Link> */}
      <Link
        href={`/dashboard${queryString}`}
        className={costPathActive ? '' : 'text-gray-300'}
      >
        Cost
      </Link>
      {/* <Link
        href={`/dashboard/labor${queryString}`}
        className={linkClass('/dashboard/labor')}
      >
        Labor
      </Link> */}
    </>
  );
};

export default DashboardLinkList;
