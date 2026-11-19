import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// In development the React app (5173) proxies API calls and uploaded images to the Express server (4000),
// so the browser sees a single origin — the same setup as production.
const api = { target: 'http://localhost:4000', changeOrigin: false };

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    open: true,
    fs: { allow: ['..'] }, // lets the app import ../shared/site-content.json
    proxy: { '/api': api, '/uploads': api },
  },
  preview: {
    port: 4173,
    proxy: { '/api': api, '/uploads': api },
  },
  build: {
    target: 'es2020',
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          motion: ['framer-motion'],
          react: ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  },
});
