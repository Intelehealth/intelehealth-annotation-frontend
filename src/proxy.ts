import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// The API serves proxied images and media, so its origin must be allowed as an
// image/media source. On localhost it is http, which the https: source does not
// cover — without this every proxied image is blocked by the browser.
const API_ORIGIN = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export function proxy(request: NextRequest) {
  const response = NextResponse.next();

  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob: https: ${API_ORIGIN}`,
    `media-src 'self' data: blob: https: ${API_ORIGIN}`,
    "font-src 'self' data:",
    "connect-src 'self' https: http://localhost:4000",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');

  response.headers.set('Content-Security-Policy', csp);
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  return response;
}

export const config = {
  matcher: '/((?!_next/static|_next/image|favicon.ico).*)',
};