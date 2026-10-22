import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import type { ProxyOptions } from 'vite'

// Jaz's stats service doesn't send CORS headers, so the browser can't call it
// directly. Whatever hosts the production build needs the same rewrite.
const proxy: Record<string, ProxyOptions> = {
  '/jazco': {
    target: 'https://bsky-search.jazco.io',
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/jazco/, ''),
  },
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Bluesky OAuth only allows loopback dev clients on 127.0.0.1, not localhost.
  server: { host: '127.0.0.1', proxy },
  preview: { host: '127.0.0.1', proxy },
})
