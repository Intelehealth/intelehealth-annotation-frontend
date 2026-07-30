import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  // Keep dev and production compiler artifacts isolated. Running `next dev`
  // while a production build is writing `.next` can leave webpack-runtime.js
  // pointing at a vendor chunk that no longer exists.
  distDir: process.env.NODE_ENV === 'development' ? '.next-dev' : '.next',
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
