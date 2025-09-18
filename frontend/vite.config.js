// vite.config.js
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const BACKEND = (env.VITE_API_URL || 'http://localhost:3001').replace(/\/$/, '');

  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        '/api': { target: BACKEND, changeOrigin: true },
        '^/[\\w-]+/api': { target: BACKEND, changeOrigin: true },
        '/billing/plans': { target: BACKEND, changeOrigin: true },
        '/billing/checkout': { target: BACKEND, changeOrigin: true },
        '/billing/portal': { target: BACKEND, changeOrigin: true },
        '/api/billing': { target: BACKEND, changeOrigin: true },
      },
    },
    preview: {
      port: 5173,
      proxy: {
        '/api': { target: BACKEND, changeOrigin: true },
        '^/[\\w-]+/api': { target: BACKEND, changeOrigin: true },
        '/billing/plans': { target: BACKEND, changeOrigin: true },
        '/billing/checkout': { target: BACKEND, changeOrigin: true },
        '/billing/portal': { target: BACKEND, changeOrigin: true },
        '/api/billing': { target: BACKEND, changeOrigin: true },
      },
    },
  };
});
