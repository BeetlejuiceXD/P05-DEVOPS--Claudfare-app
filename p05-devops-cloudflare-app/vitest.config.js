import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// Keep unit tests independent of the Cloudflare plugin and real D1 resources.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.jsx', 'worker/**/*.test.js'],
    setupFiles: ['./src/test/setup.js'],
    reporters: ['default', 'junit'],
    outputFile: { junit: './test-results/junit.xml' },
    coverage: {
      provider: 'v8',
      include: ['src/App.jsx', 'worker/index.js'],
      reportsDirectory: './coverage',
      reporter: ['text', 'html', 'lcov', 'json-summary'],
      thresholds: { statements: 80, branches: 80, functions: 80, lines: 80 },
    },
  },
})
