import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/team-dashboard',
  server: {
    host: '0.0.0.0',
    port: 5177,
    allowedHosts: ['failsafe.amd.com', 'localhost', '.amd.com'],
    proxy: {
      '/team-dashboard-api': {
        target: 'http://teamdash_backend:8000',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/team-dashboard-api/, ''),
      },
    },
  },
});
