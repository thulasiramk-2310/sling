import { resolve } from 'node:path'
import { defineConfig } from 'vite'

// Content scripts can't be ES modules, so this one is bundled into a single classic script.
export default defineConfig({
  publicDir: false,
  build: {
    outDir: resolve(import.meta.dirname, 'dist-extension'),
    emptyOutDir: false,
    lib: {
      entry: resolve(import.meta.dirname, 'src/extension/content.ts'),
      formats: ['iife'],
      name: 'GestureOSContent',
      fileName: () => 'content.js',
    },
  },
})
