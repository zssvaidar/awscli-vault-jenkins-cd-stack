import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

const TWENTY_API_URL = process.env.TWENTY_API_URL ?? 'http://localhost:3000';
const TWENTY_API_KEY =
  process.env.TWENTY_API_KEY ??
  'eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6ImM2NDUxMTEyLWViMzItNDQ2NS1hZDc3LTBmNzI5OGRlMzUwYiJ9.eyJzdWIiOiJhZWY0M2EzZC0yNDIwLTQ5Y2YtYmZlMC03N2JkMDEyMmRlOTEiLCJ0eXBlIjoiQVBJX0tFWSIsIndvcmtzcGFjZUlkIjoiYWVmNDNhM2QtMjQyMC00OWNmLWJmZTAtNzdiZDAxMjJkZTkxIiwiaWF0IjoxNzg4MzYzODU4LCJleHAiOjQ5NDE5NjM4NTcsImp0aSI6IjlhNTcyOTIzLWE3ZDMtNDgwMi1hYTUyLTU2MjY3MjNkMDZjMSJ9.TG4mlim0k8fRdYcfF7RkFm-6Fh8lJPWMUEjWMCvXJ85mV1qJhX-_8smfoEHoT-uil7rEFIGlWEHkz3X-7JZ9iw';

// Make env vars available to globalSetup (test.env only applies to workers)
process.env.TWENTY_API_URL = TWENTY_API_URL;
process.env.TWENTY_API_KEY = TWENTY_API_KEY;

export default defineConfig({
  plugins: [
    tsconfigPaths({
      projects: ['tsconfig.spec.json'],
      ignoreConfigErrors: true,
    }),
  ],
  test: {
    testTimeout: 120_000,
    hookTimeout: 120_000,
    fileParallelism: false,
    include: [
      'src/**/*test.ts'
    ],
    globalSetup: ['src/__tests__/global-setup.ts'],
    env: {
      TWENTY_API_URL,
      TWENTY_API_KEY,
    },
  },
});
