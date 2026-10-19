import { defineConfig } from 'vite'
import { productApi } from './server/productApi.ts'

export default defineConfig({
  base: './',
  plugins: [productApi()],
  test: { environment: 'node', include: ['tests/**/*.test.ts'] },
} as Parameters<typeof defineConfig>[0])
