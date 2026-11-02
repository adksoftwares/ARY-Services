import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const appRoot = fileURLToPath(new URL('.', import.meta.url));
const repositoryRoot = resolve(appRoot, '../..');

export default defineConfig({
  root: appRoot,
  plugins: [react()],
  server: { fs: { allow: [repositoryRoot] } },
  build: {
    outDir: resolve(repositoryRoot, 'dist/apps/admin-dashboard'),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-icons': ['lucide-react']
        }
      }
    }
  }
});
