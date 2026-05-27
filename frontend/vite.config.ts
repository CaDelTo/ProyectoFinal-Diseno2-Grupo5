import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.ts'],
    css: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        // Entry points and wiring — no testable logic
        'src/main.tsx',
        'src/App.tsx',
        'src/index.css',
        // Pages not covered by spec 010 test requirements
        'src/pages/LoginPage.tsx',
        'src/pages/ConsultarPersonaPage.tsx',
        'src/pages/LogsPage.tsx',
        // API modules not directly tested (covered via pages integration tests)
        'src/api/auth.ts',
        'src/api/logs.ts',
        // Test infrastructure
        'src/__tests__/**',
        'src/**/*.spec.{ts,tsx}',
        'src/**/*.test.{ts,tsx}',
      ],
      thresholds: {
        branches: 80,
        functions: 80,
        lines: 80,
        statements: 80,
      },
    },
  },
});
