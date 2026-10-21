// See https://svelte.dev/docs/kit/types#app.d.ts
import type { Auth } from '#lib/server/auth-core.ts';
import type { DB } from '#lib/server/db-core.ts';
import type { Me } from '#lib/server/services/people.ts';

declare global {
	namespace App {
		interface Locals {
			db: DB;
			auth: Auth;
			/** Signed-in person, looked up on first use (null for visitors). */
			me: () => Promise<Me | null>;
		}
	}
}

export {};
