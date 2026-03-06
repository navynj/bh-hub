import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const nextConfig: NextConfig = {
  /* avoid Turbopack panic; use Webpack for dev */
  turbopack: false,
};

const withNextIntl = createNextIntlPlugin();
// next-intl overwrites turbopack with its own config; force false again so dev uses Webpack
const config = withNextIntl(nextConfig);
export default typeof config === 'function' ? config : { ...config, turbopack: false };
