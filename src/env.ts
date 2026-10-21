import { defineEnvVars } from '@sveltejs/kit/env';
import { building, dev } from '$app/env';

const optional = (value: string | undefined) => (value ? value : undefined);

export const variables = defineEnvVars({
	DATABASE_URL: {
		description: 'Postgres connection string. In production the Hyperdrive binding is used instead when present.',
		schema: (value) => value || 'postgres://postgres@127.0.0.1:54329/postgres'
	},
	BETTER_AUTH_SECRET: {
		description: 'Random secret (32+ characters) used to sign sessions.',
		schema: (value) => {
			if (value && value.length >= 32) return value;
			if (!dev && !building) throw new Error('BETTER_AUTH_SECRET must be at least 32 characters');
			return 'dev-only-secret-change-me-dev-only-secret';
		}
	},
	ORIGIN: {
		description: 'Public site address, for example https://masterscorner.in',
		schema: (value) => value || 'http://localhost:5173'
	},
	GOOGLE_CLIENT_ID: { description: 'Google sign-in client id (optional).', schema: optional },
	GOOGLE_CLIENT_SECRET: { description: 'Google sign-in client secret (optional).', schema: optional },
	OTP_SENDER: {
		description: 'How login codes are sent: "console" (development) or "msg91".',
		schema: (value) => (value === 'msg91' ? 'msg91' : 'console') as 'console' | 'msg91'
	},
	MSG91_AUTH_KEY: { description: 'MSG91 API key (when OTP_SENDER=msg91).', schema: optional },
	MSG91_TEMPLATE_ID: { description: 'MSG91 DLT-approved OTP template id.', schema: optional },
	PUBLIC_MAPS_KEY: {
		public: true,
		description: 'Browser key for address autocomplete (optional; manual address entry works without it).',
		schema: optional
	}
});
