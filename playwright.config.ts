import { defineConfig, devices } from '@playwright/test';

// Runs against a local dev server (npm run db:dev, npm run db:migrate, npm run dev).
export default defineConfig({
	testDir: 'e2e',
	timeout: 60_000,
	fullyParallel: false,
	use: {
		baseURL: process.env.BASE_URL ?? 'http://127.0.0.1:5173',
		...devices['Pixel 5'],
		launchOptions: process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}
	}
});
