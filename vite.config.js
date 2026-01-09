import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  root: 'src/demos',
  plugins: [vue()],
  server: {
    port: 3000,
    open: true
  },
  resolve: {
    alias: {
      '@': '/src/demos',
    },
  },
  optimizeDeps: {
    include: ['vue', 'jszip'],
  },
  define: {
    global: 'globalThis',
  },
});
