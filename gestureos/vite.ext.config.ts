import { resolve } from 'node:path'
import { defineConfig } from 'vite'

// Extension pages (popup, welcome, offscreen) and the module service worker.
// The content script is built separately as a classic IIFE (vite.content.config.ts).
export default defineConfig({
  root: resolve(import.meta.dirname, 'extension'),
  publicDir: resolve(import.meta.dirname, 'public'),
  base: './',
  build: {
    outDir: resolve(import.meta.dirname, 'dist-extension'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        popup: resolve(import.meta.dirname, 'extension/popup.html'),
        welcome: resolve(import.meta.dirname, 'extension/welcome.html'),
        offscreen: resolve(import.meta.dirname, 'extension/offscreen.html'),
        background: resolve(import.meta.dirname, 'src/extension/background.ts'),
      },
      output: {
        entryFileNames: (chunk) => (chunk.name === 'background' ? 'background.js' : 'assets/[name]-[hash].js'),
      },
    },
  },
})
