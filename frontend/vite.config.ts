// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        secure: false,
      },
    },
    // ✅ CRITICAL: Allow Vite to serve public files AND node_modules/pdfjs-dist
    fs: {
      allow: [
        '.', // project root
        'node_modules/pdfjs-dist/build', // explicitly allow PDF.js worker files
      ],
    },
  },
  build: {
    sourcemap: true,
  },
  // ✅ CRITICAL: Tell Vite where static assets live
  publicDir: 'public',
});