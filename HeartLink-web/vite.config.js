import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '')

  return {
    plugins: [react(),
    tailwindcss(),
    ],
    server: {
      // Docker on Windows/macOS: file changes only reach the container when polled (see DOCKER.md)
      watch: env.VITE_USE_POLLING === 'true' ? { usePolling: true, interval: 300 } : undefined,
      // HL-033: proxy the API so the admin session cookie is same-origin (SameSite=Strict).
      proxy: {
        '/api': {
          target: env.VITE_PROXY_TARGET || 'http://127.0.0.1:8000',
          changeOrigin: true,
        },
        '/static': {
          target: env.VITE_PROXY_TARGET || 'http://127.0.0.1:8000',
          changeOrigin: true,
        },
      },
    },
  }
})
