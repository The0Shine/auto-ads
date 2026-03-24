import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api/v1/optimizer': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace('/api/v1/optimizer', '/optimizer'),
      },
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
