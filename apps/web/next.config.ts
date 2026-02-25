import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@credflow/ui', '@credflow/shared'],
};

export default nextConfig;
