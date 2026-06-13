// vite.config.js
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  // En dev puedes dejarlo a 3000; en prod Vercel ignora esto.
  const BACKEND = (env.VITE_API_URL || 'http://localhost:3000').replace(/\/$/, '');

  return {
    plugins: [react()],
    server: {
      port: 5173,
      allowedHosts: true,
      proxy: {
        // Rutas relativas -> backend (evita CORS en local)
        '/api': { target: BACKEND, changeOrigin: true },
        '^/[\\w-]+/api': { target: BACKEND, changeOrigin: true },
        // Endpoints billing directos (si los usas desde el front)
        '/billing/plans': { target: BACKEND, changeOrigin: true },
        '/billing/checkout': { target: BACKEND, changeOrigin: true },
        '/billing/portal': { target: BACKEND, changeOrigin: true },
        '/api/billing': { target: BACKEND, changeOrigin: true },
      },
    },
    preview: {
      port: 3000,
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
