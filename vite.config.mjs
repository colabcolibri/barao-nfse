import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  root: 'web',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'web/src')
    }
  },
  server: {
    proxy: {
      '/api': 'http://127.0.0.1:3334'
    }
  },
  build: {
    outDir: '../public',
    emptyOutDir: true
  }
});
