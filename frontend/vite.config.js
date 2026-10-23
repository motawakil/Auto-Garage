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
    proxy: {
      '/api': process.env.BACKEND_URL || 'http://127.0.0.1:8010',
      '/media': process.env.BACKEND_URL || 'http://127.0.0.1:8010',
    },
  },
})
