import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

// Keep the existing root app intact while adding a dedicated Customer app entry.
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(process.cwd(), 'index.html'),
        customer: resolve(process.cwd(), 'customer.html')
      }
    }
  }
});
