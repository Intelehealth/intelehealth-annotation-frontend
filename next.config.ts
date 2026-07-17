import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  compiler: {
    removeConsole: {
      exclude: ['error'],
    },
  },
  // NOTE: Do NOT add outputFileTracingExcludes here.
  // @swc/helpers is a Next.js runtime dependency — excluding it breaks the
  // production server with MODULE_NOT_FOUND errors.
};

export default nextConfig;