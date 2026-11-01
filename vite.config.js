import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

// Keep the original root app while building dedicated Customer and Provider entries.
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(process.cwd(), 'index.html'),
        customer: resolve(process.cwd(), 'customer.html'),
        provider: resolve(process.cwd(), 'provider.html')
      }
    }
  }
});
