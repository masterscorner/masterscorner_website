import { asPerson, type DB } from '../db-core.ts';

export interface SessionUser {
	id: string;
	name: string;
	email: string;
	phoneNumber?: string | null;
}

export interface Me {
	id: string;
	display_name: string;
	phone_e164: string | null;
	/** true until the person has typed their name and accepted the notice */
	needsWelcome: boolean;
}

export const NOTICE_VERSION = '2026-10-v1';

/**
 * Find (or create) the person behind a login. Runs with the server's own role because the
 * person row may not exist yet. A teacher may already have added this phone number as a
 * student: that record is claimed instead of creating a duplicate.
 */
export async function ensurePerson(db: DB, user: SessionUser): Promise<Me> {
	const existing = await db
		.selectFrom('persons')
		.select(['id', 'display_name', 'phone_e164'])
		.where('user_id', '=', user.id)
		.where('deleted_at', 'is', null)
		.executeTakeFirst();
	if (existing) return withWelcome(db, existing);

	const phone = user.phoneNumber ?? null;
	return db.transaction().execute(async (tx) => {
		let person = phone
			? await tx
					.selectFrom('persons')
					.select(['id', 'display_name', 'phone_e164'])
					.where('phone_e164', '=', phone)
					.where('user_id', 'is', null)
					.where('is_minor', '=', false)
					.where('deleted_at', 'is', null)
					.orderBy('created_at')
					.limit(1)
					.executeTakeFirst()
			: undefined;

		if (person) {
			await tx.updateTable('persons').set({ user_id: user.id }).where('id', '=', person.id).execute();
		} else {
			const looksLikePhone = /^\+?\d+$/.test(user.name);
			person = await tx
				.insertInto('persons')
				.values({
					user_id: user.id,
					display_name: looksLikePhone ? 'New member' : user.name.slice(0, 80),
					phone_e164: phone
				})
				.returning(['id', 'display_name', 'phone_e164'])
				.executeTakeFirstOrThrow();
		}

		if (phone) {
			// Parents invited by a class see the invitation and must confirm it themselves.
			await tx
				.updateTable('guardianships')
				.set({ guardian_id: person.id })
				.where('invited_phone', '=', phone)
				.where('guardian_id', 'is', null)
				.where('status', '=', 'pending')
				.execute();
		}
		return { ...person, needsWelcome: true };
	});
}

async function withWelcome(db: DB, p: { id: string; display_name: string; phone_e164: string | null }): Promise<Me> {
	const consent = await db
		.selectFrom('consents')
		.select('id')
		.where('subject_id', '=', p.id)
		.where('purpose', '=', 'platform_account')
		.where('withdrawn_at', 'is', null)
		.executeTakeFirst();
	return { ...p, needsWelcome: !consent };
}

/** Saves the person's name and their consent to the platform notice. */
export async function completeWelcome(db: DB, personId: string, name: string, birthYear: number) {
	await asPerson(db, personId, async (tx) => {
		await tx
			.updateTable('persons')
			.set({ display_name: name, birth_date: `${birthYear}-01-01` })
			.where('id', '=', personId)
			.execute();
		await tx
			.insertInto('consents')
			.values({
				subject_id: personId,
				given_by: personId,
				purpose: 'platform_account',
				notice_version: NOTICE_VERSION,
				method: 'otp_self'
			})
			.execute();
	});
}
