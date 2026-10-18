import { defineConfig } from 'vite'

// The playground website. The extension has its own configs (vite.ext.config.ts, vite.content.config.ts).
export default defineConfig({
  base: './',
  build: { outDir: 'dist' },
  test: { environment: 'node', include: ['tests/**/*.test.ts'] },
} as Parameters<typeof defineConfig>[0])
