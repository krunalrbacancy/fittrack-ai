import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    },
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        configure: (proxy, _options) => {
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            // Add cache-busting headers to API requests
            proxyReq.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
            proxyReq.setHeader('Pragma', 'no-cache');
          });
        }
      }
    }
  },
  publicDir: 'public',
  build: {
    rollupOptions: {
      output: {
        manualChunks: undefined
      }
    }
  }
})

