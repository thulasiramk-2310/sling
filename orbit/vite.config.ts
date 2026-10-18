import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Relative base so the build works from any host path (static hosting, preview links).
export default defineConfig({
  base: './',
  plugins: [react()],
})
