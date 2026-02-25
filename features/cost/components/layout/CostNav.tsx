'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const CostNav = () => {
  const pathname = usePathname();
  const t = useTranslations();

  return (
    <nav className="max-sm:w-full max-sm:p-0 [&>*]:whitespace-nowrap px-2 space-y-2 flex flex-col max-sm:space-y-0 max-sm:flex-row max-sm:items-center max-sm:gap-4 max-sm:text-sm [&>*]:font-extrabold [&>*]:text-lg max-sm:mb-4">
      <Link
        href="/cost/list"
        className={
          pathname.includes('/cost/list') || pathname === '/cost'
            ? ''
            : 'text-gray-300'
        }
      >
        {t('Cost.costs')}
      </Link>
      <Link
        href="/cost/product"
        className={pathname.includes('/cost/product') ? '' : 'text-gray-300'}
      >
        {t('Product.products')}
      </Link>
      <Link
        href="/cost/config"
        className={pathname.includes('/cost/config') ? '' : 'text-gray-300'}
      >
        {t('Config.config')}
      </Link>
    </nav>
  );
};

export default CostNav;
