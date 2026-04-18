// Gated logging utility. Voice/realtime code is very chatty; gating keeps
// production consoles clean and avoids leaking lesson content. Enable with
// `NEXT_PUBLIC_VOICE_DEBUG=1` in the environment.
//
// Use `debug` for informational/diagnostic logs. Continue to use
// `console.error` for actual errors so they remain visible in production.

const DEBUG_ENABLED =
  typeof process !== 'undefined' &&
  process.env.NEXT_PUBLIC_VOICE_DEBUG === '1';

export const debug = (...args: unknown[]): void => {
  if (DEBUG_ENABLED) {
    // eslint-disable-next-line no-console
    console.log(...args);
  }
};

export const debugWarn = (...args: unknown[]): void => {
  if (DEBUG_ENABLED) {
    // eslint-disable-next-line no-console
    console.warn(...args);
  }
};

export const isDebugEnabled = (): boolean => DEBUG_ENABLED;
