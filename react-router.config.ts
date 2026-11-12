import type { Config } from '@react-router/dev/config';

export default {
  // Config options...
  // Server-side render by default, to enable SPA mode set this to `false`
  ssr: true,
  future: {
    v8_middleware: true,
    // Pre-bundle every route's dependencies when the dev server starts, so Vite never finds a new one mid-session
    // and reloads the page (that reload broke the first client navigation in e2e on a fresh CI cache).
    unstable_optimizeDeps: true,
  },
} satisfies Config;
