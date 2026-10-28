import path from 'node:path'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': path.resolve(import.meta.dirname, 'src') } },
  server: {
    port: 5180,
    host: true,
    // Keep the browser's Host header so Django's CSRF origin check sees the real origin.
    proxy: {
      '/api': { target: process.env.BACKEND_URL || 'http://127.0.0.1:8010', changeOrigin: false },
    },
  },
})
