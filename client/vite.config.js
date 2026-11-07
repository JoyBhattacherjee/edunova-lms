import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In development, /api calls are proxied to the Node server so you don't need CORS or env vars.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'https://edunova-lms-server-sooty.vercel.app', changeOrigin: true },
    },
  },
});
