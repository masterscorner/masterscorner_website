// Loads .env into process.env for scripts (Node 22 has this built in).
import { existsSync } from 'node:fs';

export function loadEnv(file = '.env') {
	if (existsSync(file)) process.loadEnvFile(file);
}
