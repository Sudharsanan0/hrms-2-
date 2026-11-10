import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    open: false,
  },
  build: {
    rolldownOptions: {
      output: {
        // Split the heavy third-party libraries out of the app chunk so a
        // product change does not invalidate the whole cached bundle.
        advancedChunks: {
          groups: [
            { name: 'supabase', test: /node_modules[\\/]@supabase[\\/]supabase-js/ },
            { name: 'react-vendor', test: /node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/ },
          ],
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    // Tests always run against the demo adapter, never against a real
    // Supabase project — even when a local .env exists.
    env: {
      VITE_SUPABASE_URL: '',
      VITE_SUPABASE_ANON_KEY: '',
      VITE_SUPABASE_PUBLISHABLE_KEY: '',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/services/**/*.ts', 'src/lib/**/*.ts'],
    },
  },
});
