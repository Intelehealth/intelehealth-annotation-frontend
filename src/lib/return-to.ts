/**
 * #15: after login, go back to the page the user was trying to open (a shared visit link,
 * /ai-dashboard, ...) instead of always landing on /dashboard.
 *
 * The page is kept in sessionStorage (this tab only), never in the URL. Only same-site paths are
 * accepted, so a crafted value cannot send the user to another site.
 */
const KEY = 'returnTo';
export const DEFAULT_AFTER_LOGIN = '/dashboard';
const AUTH_PAGES = ['/login', '/admin-login', '/forgot-password', '/reset-password', '/create-password', '/verify-email', '/auth'];

/** A same-site path that is not an auth page, else null. */
export function safeReturnPath(p: string | null | undefined): string | null {
  if (!p || !p.startsWith('/') || p.startsWith('//') || p.includes('\\')) return null;
  const path = p.split(/[?#]/)[0];
  if (path === '/' || AUTH_PAGES.some((a) => path === a || path.startsWith(`${a}/`))) return null;
  return p;
}

/** Remember the current page before sending a logged-out user to /login. */
export function rememberReturnTo(): void {
  try {
    const p = safeReturnPath(window.location.pathname + window.location.search);
    if (p) sessionStorage.setItem(KEY, p);
  } catch { /* storage unavailable: the user lands on the default page */ }
}

/** Where to go after a successful login; clears the remembered page. */
export function takeReturnTo(): string {
  try {
    const p = safeReturnPath(sessionStorage.getItem(KEY));
    sessionStorage.removeItem(KEY);
    return p ?? DEFAULT_AFTER_LOGIN;
  } catch {
    return DEFAULT_AFTER_LOGIN;
  }
}

/** Send a logged-out user to /login, remembering where they were. */
export function goToLogin(router: { push: (href: string) => void }): void {
  rememberReturnTo();
  router.push('/login');
}
