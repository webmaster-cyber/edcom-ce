import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:80',
        changeOrigin: true,
      },
      '/i': {
        target: 'http://localhost:80',
        changeOrigin: true,
      },
      // Link tracking endpoint - use regex to match exactly /l or /l?query
      '^/l(\\?.*)?$': {
        target: 'http://localhost:80',
        changeOrigin: true,
        rewrite: (path) => path,
      },
      '/signup': {
        target: 'http://localhost:80',
        changeOrigin: true,
      },
    },
  },
})
