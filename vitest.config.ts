/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // vite.config.ts defines this at build time; tests get a fixed value so the
  // version check (useAppUpdateNotice) has a known build to compare against.
  define: {
    __BUILD_TIMESTAMP__: JSON.stringify('test-build'),
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['**/*.{test,spec}.{js,mjs,cjs,ts,mtsx,cts,jsx,tsx}'],
  },
})
