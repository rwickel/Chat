// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: true,
    // 👇 Add proxy for API requests in development
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000', // 👈 your backend URL
        changeOrigin: true,             // needed for virtual hosts
        secure: false,                  // disable SSL check for localhost
        // Optional: log proxy requests for debugging
        // configure: (proxy, options) => {
        //   console.log('Proxying:', options.target + options.path);
        // },
      },
    },
  },
  build: {
    sourcemap: true,
  },
});