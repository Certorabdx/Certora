import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@certora/core': path.resolve(__dirname, './packages/core/src/index.ts'),
      '@certora/beldex-adapter': path.resolve(
        __dirname,
        './packages/beldex-adapter/src/index.ts',
      ),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
    include: [
      'src/**/*.{test,spec}.{ts,tsx}',
      'packages/**/*.{test,spec}.{ts,tsx}',
    ],
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
