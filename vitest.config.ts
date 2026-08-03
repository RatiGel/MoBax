import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  // tsconfig.json must keep `jsx: "preserve"` for Next.js, which leaves Vite
  // unable to parse `.tsx` sources. Override the JSX transform here only, so
  // tests can import pure helpers out of `.tsx` component modules.
  oxc: { jsx: { runtime: 'automatic' } },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
});
