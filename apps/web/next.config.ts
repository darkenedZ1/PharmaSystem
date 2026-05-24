import type { NextConfig } from 'next';

const config: NextConfig = {
  transpilePackages: ['@pharmacy/shared'],
  experimental: {
    typedRoutes: true,
  },
};

export default config;
