import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const nextConfig: NextConfig = {
  /* Use Webpack for dev (avoid Turbopack): run with `pnpm dev` which uses `next dev --webpack` */
};

const withNextIntl = createNextIntlPlugin();
export default withNextIntl(nextConfig);
