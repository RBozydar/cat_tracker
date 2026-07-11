import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    // Dev-only: proxy API calls to the FastAPI backend. Local dev runs uvicorn on
    // :8137 (host :3000 is taken by an unrelated service); the container still
    // serves on :3000 internally, but that path never uses this proxy.
    proxy: {
      '/api': 'http://localhost:8137',
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
    css: true,
  },
})
