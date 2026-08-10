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
  // Same-origin upload proxy. The browser uploads documents to the Next server
  // (port 3000) via a relative path, and Next forwards `/processing` to the
  // backend (port 4000). This keeps only the multipart upload same-origin to
  // avoid cross-origin uploads that browser extensions/security software may
  // block. Other API calls use absolute URLs directly to the backend (see
  // src/lib/api.ts) so none of the Next page routes (e.g. /users) are shadowed.
  async rewrites() {
    const backend =
      process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    return [
      { source: '/processing/:path*', destination: `${backend}/processing/:path*` },
    ];
  },
  // NOTE: Do NOT add outputFileTracingExcludes here.
  // @swc/helpers is a Next.js runtime dependency — excluding it breaks the
  // production server with MODULE_NOT_FOUND errors.
};

export default nextConfig;
