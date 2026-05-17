import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    hmr: false,
    watch: {
      ignored: [
        '**/.wrangler/**',
        '**/dist/**',
        '**/drizzle/**',
        '**/docs/**',
        '**/worker-configuration.d.ts',
      ],
    },
    proxy: {
      '/api': 'http://localhost:8787',
    },
  },
})
