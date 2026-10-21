// Development only: fills the local database with fictional demo classes so pages have something to show.
// Use: npm run db:seed   (after npm run db:migrate). Never run against production.
import { sql } from 'kysely';
import { connect, asPerson } from '../src/lib/server/db-core.ts';
import { createClass } from '../src/lib/server/services/classes.ts';
import { addStudent } from '../src/lib/server/services/students.ts';
import { loadEnv } from './env.ts';
import { seedHistory } from './seed-history.ts';

loadEnv();
const url = process.env.DATABASE_URL ?? 'postgres://postgres@127.0.0.1:54329/postgres';
if (!/127\.0\.0\.1|localhost/.test(url)) {
	console.error('Refusing to seed a non-local database.');
	process.exit(1);
}
const { db, end } = connect(url, 1);

const existing = await db.selectFrom('orgs').select(sql<number>`count(*)::int`.as('n')).executeTakeFirstOrThrow();

if (existing.n > 0) {
	console.log('Demo classes already present.');
} else {
	const acts = Object.fromEntries((await db.selectFrom('activity_nodes').select(['id', 'slug']).execute()).map((a) => [a.slug, a.id]));

	const demo = [
		{ name: 'Demo Shito-Ryu Karate Dojo', act: ['karate'], city: 'Madurai', state: 'Tamil Nadu', locality: 'Anna Nagar', lat: 9.9312, lng: 78.1456, langs: ['Tamil', 'English'], fee: 800 },
		{ name: 'Demo Natyalaya Bharatanatyam', act: ['bharatanatyam'], city: 'Madurai', state: 'Tamil Nadu', locality: 'K K Nagar', lat: 9.9407, lng: 78.1367, langs: ['Tamil'], fee: 1200 },
		{ name: 'Demo Silambam Kalari', act: ['silambam', 'kalaripayattu'], city: 'Madurai', state: 'Tamil Nadu', locality: 'Tallakulam', lat: 9.9405, lng: 78.1305, langs: ['Tamil'], fee: 600 },
		{ name: 'Demo Cricket Academy', act: ['cricket'], city: 'Madurai', state: 'Tamil Nadu', locality: 'Thiruparankundram', lat: 9.8806, lng: 78.0715, langs: ['Tamil', 'English'], fee: 1500 },
		{ name: 'Demo Isai Carnatic Music School', act: ['carnatic-vocal', 'veena'], city: 'Madurai', state: 'Tamil Nadu', locality: 'Simmakkal', lat: 9.9265, lng: 78.1198, langs: ['Tamil'], fee: 1000 },
		{ name: 'Demo Taekwondo Club', act: ['taekwondo'], city: 'Madurai', state: 'Tamil Nadu', locality: 'Ponmeni', lat: 9.9168, lng: 78.0985, langs: ['Tamil', 'English'], fee: 700 },
		{ name: 'Demo Yoga Shala', act: ['hatha-yoga'], city: 'Madurai', state: 'Tamil Nadu', locality: 'S S Colony', lat: 9.9235, lng: 78.1032, langs: ['Tamil', 'English'], fee: 900, women: true },
		{ name: 'Demo Badminton Arena', act: ['badminton'], city: 'Chennai', state: 'Tamil Nadu', locality: 'Velachery', lat: 12.9815, lng: 80.2180, langs: ['Tamil', 'English'], fee: 2000 },
		{ name: 'Demo Kathak Studio', act: ['kathak'], city: 'Bengaluru', state: 'Karnataka', locality: 'Jayanagar', lat: 12.9299, lng: 77.5826, langs: ['Hindi', 'English', 'Kannada'], fee: 1800 },
		{ name: 'Demo Swim School', act: ['swimming'], city: 'Bengaluru', state: 'Karnataka', locality: 'Indiranagar', lat: 12.9784, lng: 77.6408, langs: ['English', 'Kannada'], fee: 2500 }
	];

	const reviewsText = ['Very patient teacher. My son loves it.', 'Good discipline and clean place.', 'Classes start on time.', 'Fees are fair. Good coaching.'];

	for (const [i, d] of demo.entries()) {
		const owner = await db
			.insertInto('persons')
			.values({ user_id: `demo-owner-${i}`, display_name: `Demo Teacher ${i + 1}`, phone_e164: `+9190000100${String(i).padStart(2, '0')}`, birth_date: '1985-01-01' })
			.returning('id')
			.executeTakeFirstOrThrow();
		const created = await createClass(db, owner.id, {
			name: d.name,
			activityIds: d.act.map((s) => acts[s]).filter(Boolean),
			city: d.city,
			state: d.state,
			addressLine: `${10 + i} Main Road`,
			locality: d.locality,
			postalCode: null,
			lat: d.lat,
			lng: d.lng,
			precise: true,
			whatsapp: `+9190000200${String(i).padStart(2, '0')}`,
			showWhatsapp: true,
			phone: null,
			showPhone: false,
			teachingLanguages: d.langs,
			ageGroups: d.women ? ['adults'] : ['kids', 'teens', 'adults'],
			upiId: 'demo@upi',
			batch: { name: 'Evening batch', days: [1, 3, 5], start: '17:30', end: '18:30', feePaise: d.fee * 100, feePeriod: 'month' }
		});
		await db.updateTable('orgs').set({ women_only: Boolean(d.women), about: 'This is a demo class used for testing. It is not a real class.' }).where('id', '=', created.id).execute();

		const batch = await db.selectFrom('batches').select('id').where('org_id', '=', created.id).executeTakeFirstOrThrow();
		await db
			.insertInto('batches')
			.values({ org_id: created.id, name: 'Weekend batch', days: [6, 0], start_time: '07:00', end_time: '08:30', fee_paise: d.fee * 100, fee_period: 'month' })
			.execute();

		// A few adult students who attended and left a review.
		for (let r = 0; r < (i % 4) + 1; r++) {
			const student = await db
				.insertInto('persons')
				.values({ user_id: `demo-student-${i}-${r}`, display_name: `Student${r + 1} Demo`, birth_date: '1995-01-01' })
				.returning('id')
				.executeTakeFirstOrThrow();
			await db.insertInto('enrolments').values({ org_id: created.id, batch_id: batch.id, person_id: student.id }).execute();
			const session = await db.insertInto('class_sessions').values({ org_id: created.id, batch_id: batch.id, on_date: '2026-10-12' }).onConflict((oc) => oc.doNothing()).returning('id').executeTakeFirst()
				?? await db.selectFrom('class_sessions').select('id').where('batch_id', '=', batch.id).where('on_date', '=', '2026-10-12').executeTakeFirstOrThrow();
			await db.insertInto('attendance').values({ id: crypto.randomUUID(), org_id: created.id, session_id: session.id, person_id: student.id, status: 'present', marked_by: owner.id }).execute();
			await asPerson(db, student.id, (tx) =>
				tx.insertInto('reviews').values({ org_id: created.id, author_id: student.id, rating: 4 + ((i + r) % 2), body: reviewsText[(i + r) % reviewsText.length] }).execute()
			);
		}

		// Children added by the teacher, waiting for their parent.
		if (i === 0) {
			await addStudent(db, owner.id, created.id, { name: 'Anu Demo', isChild: true, phone: null, guardianPhone: '+919999900001', batchId: batch.id });
			await addStudent(db, owner.id, created.id, { name: 'Karthik Demo', isChild: true, phone: null, guardianPhone: '+919999900002', batchId: batch.id });
		}
		console.log(`seeded ${d.name}`);
	}
}

await seedHistory(db, new Date(Date.now() + 5.5 * 3_600_000).toISOString().slice(0, 10));
await end();
