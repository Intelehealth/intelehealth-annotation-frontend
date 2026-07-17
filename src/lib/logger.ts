/**
 * Dev-only logger. Logs only when NODE_ENV is NOT 'production'.
 * In production builds, the compiler.removeConsole option in next.config.ts
 * strips console.log/debug/info/warn at build time anyway — this wrapper
 * makes the logging intent explicit and prevents accidental production leaks
 * even if the build-time strip is not active (e.g. server-side code).
 */
const isDev = typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production';

export const logger = {
  log: (...args: unknown[]) => {
    if (isDev) console.log(...args);
  },
  debug: (...args: unknown[]) => {
    if (isDev) console.debug(...args);
  },
  info: (...args: unknown[]) => {
    if (isDev) console.info(...args);
  },
  warn: (...args: unknown[]) => {
    if (isDev) console.warn(...args);
  },
  error: (...args: unknown[]) => {
    console.error(...args);
  },
};