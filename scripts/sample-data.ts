// Sample (demonstration) classes across India, for showing MastersCorner to people.
// Everything added here is marked is_sample = true and shows a "Sample" tag on the site.
//
//   npm run sample:add        add the sample classes (skips if they are already there)
//   npm run sample:remove     delete every sample class, student, review and record
//
// Uses DATABASE_URL (default: the local database). For the live database put the Supabase
// Session pooler address in front, e.g.  DATABASE_URL='postgresql://...?sslmode=require' npm run sample:add
// Optional: SAMPLE_OWNER_EMAIL=you@gmail.com makes your Google account an admin of the sample
// karate class (with 3 months of history), so you can show the master's dashboard too.
import { sql } from 'kysely';
import { asPerson, connect, type DB } from '../src/lib/server/db-core.ts';
import { createClass } from '../src/lib/server/services/classes.ts';
import { loadEnv } from './env.ts';
import { addHistory } from './seed-history.ts';

loadEnv();
const url = process.env.DATABASE_URL ?? 'postgres://postgres@127.0.0.1:54329/postgres';
const mode = process.argv[2];
if (mode !== 'add' && mode !== 'remove') {
	console.error('Use: npm run sample:add  or  npm run sample:remove');
	process.exit(1);
}
const where = /127\.0\.0\.1|localhost/.test(url) ? 'the LOCAL database' : `the database at ${new URL(url).hostname}`;
const { db, end } = connect(url, 1);

type Cat = string;
interface Sample {
	name: string;
	act: string[];
	city: string;
	state: string;
	locality: string;
	lat: number;
	lng: number;
	langs: string[];
	fee: number; // rupees per month
	days: number[];
	start: string;
	end: string;
	about: string;
	ages?: string[];
	women?: boolean;
	online?: boolean;
	levels?: Cat; // level system name to use
}

const TN = 'Tamil Nadu';
const SAMPLES: Sample[] = [
	// Chennai
	{ name: 'Sri Murugan Shito-Ryu Karate Academy', act: ['karate'], city: 'Chennai', state: TN, locality: 'Anna Nagar', lat: 13.085, lng: 80.2101, langs: ['Tamil', 'English'], fee: 900, days: [1, 3, 5], start: '17:30', end: '18:30', about: 'Traditional Shito-Ryu karate for children and adults. Belt gradings every 3 months.', levels: 'Karate belts (kyu)' },
	{ name: 'Natya Kalalaya Bharatanatyam School', act: ['bharatanatyam'], city: 'Chennai', state: TN, locality: 'Mylapore', lat: 13.0339, lng: 80.2619, langs: ['Tamil', 'English'], fee: 1500, days: [2, 4], start: '16:30', end: '18:00', about: 'Classical Bharatanatyam in the Kalakshetra style. Arangetram training for senior students.', ages: ['kids', 'teens', 'adults'] },
	{ name: 'Swara Carnatic Music Class', act: ['carnatic-vocal', 'veena'], city: 'Chennai', state: TN, locality: 'T Nagar', lat: 13.0418, lng: 80.2341, langs: ['Tamil', 'Telugu'], fee: 1200, days: [6, 0], start: '09:00', end: '10:30', about: 'Carnatic vocal and veena lessons from basics (sarali varisai) to kritis.', online: true },
	{ name: 'Velachery Swim Club', act: ['swimming'], city: 'Chennai', state: TN, locality: 'Velachery', lat: 12.9815, lng: 80.218, langs: ['Tamil', 'English'], fee: 2500, days: [1, 2, 3, 4, 5], start: '06:00', end: '07:00', about: 'Learn-to-swim and stroke correction in a clean, supervised pool. Separate ladies batch.' },
	{ name: 'Adyar Yoga Shala', act: ['hatha-yoga'], city: 'Chennai', state: TN, locality: 'Adyar', lat: 13.0012, lng: 80.2565, langs: ['Tamil', 'English'], fee: 1000, days: [1, 2, 3, 4, 5, 6], start: '06:30', end: '07:30', about: 'Gentle hatha yoga and pranayama for all ages. Mats provided.', ages: ['adults', 'seniors'] },
	{ name: 'Tambaram Cricket Academy', act: ['cricket'], city: 'Chennai', state: TN, locality: 'Tambaram', lat: 12.9249, lng: 80.1, langs: ['Tamil', 'English'], fee: 1800, days: [6, 0], start: '07:00', end: '09:00', about: 'Batting, bowling and fielding coaching with turf nets. Match practice every Sunday.', ages: ['kids', 'teens'] },
	{ name: 'Porur Chess Club', act: ['chess'], city: 'Chennai', state: TN, locality: 'Porur', lat: 13.0382, lng: 80.1565, langs: ['Tamil', 'English'], fee: 800, days: [3, 6], start: '17:00', end: '18:30', about: 'Chess for beginners to rated players. Monthly in-house tournaments.', online: true },
	{ name: 'Little Picasso Art Studio', act: ['drawing', 'painting'], city: 'Chennai', state: TN, locality: 'Anna Nagar', lat: 13.0875, lng: 80.2125, langs: ['English', 'Tamil'], fee: 1100, days: [6], start: '10:00', end: '12:00', about: 'Drawing, colouring and painting for children aged 5 to 14.', ages: ['kids'] },
	// Madurai
	{ name: 'Madurai Silambam Kalari', act: ['silambam', 'kalaripayattu'], city: 'Madurai', state: TN, locality: 'Tallakulam', lat: 9.9405, lng: 78.1305, langs: ['Tamil'], fee: 600, days: [1, 3, 5], start: '06:00', end: '07:00', about: 'Traditional Tamil martial art of silambam (stick fighting) and kalaripayattu basics.' },
	{ name: 'Meenakshi Dance Academy', act: ['bharatanatyam', 'folk-dance'], city: 'Madurai', state: TN, locality: 'K K Nagar', lat: 9.9407, lng: 78.1367, langs: ['Tamil'], fee: 1000, days: [2, 4, 6], start: '17:00', end: '18:00', about: 'Bharatanatyam and Tamil folk dance (karagattam, oyilattam) for girls and women.', women: true },
	{ name: 'Anna Nagar Taekwondo Club', act: ['taekwondo'], city: 'Madurai', state: TN, locality: 'Anna Nagar', lat: 9.9312, lng: 78.1456, langs: ['Tamil', 'English'], fee: 700, days: [2, 4, 6], start: '18:00', end: '19:00', about: 'Olympic-style taekwondo with district and state competition training.', levels: 'Taekwondo belts' },
	// Coimbatore and Trichy
	{ name: 'Kovai Badminton Arena', act: ['badminton'], city: 'Coimbatore', state: TN, locality: 'Saibaba Colony', lat: 11.0247, lng: 76.9437, langs: ['Tamil', 'English', 'Malayalam'], fee: 2000, days: [1, 2, 3, 4, 5], start: '17:00', end: '18:30', about: 'Coaching on wooden courts for school children and adults. Shuttles provided.' },
	{ name: 'RS Puram Keyboard and Guitar School', act: ['keyboard', 'guitar'], city: 'Coimbatore', state: TN, locality: 'R S Puram', lat: 11.0089, lng: 76.95, langs: ['English', 'Tamil'], fee: 1400, days: [6, 0], start: '11:00', end: '12:00', about: 'Keyboard and guitar with Trinity grade exam preparation.' },
	{ name: 'Thillai Nagar Judo Club', act: ['judo'], city: 'Tiruchirappalli', state: TN, locality: 'Thillai Nagar', lat: 10.827, lng: 78.684, langs: ['Tamil'], fee: 650, days: [1, 3, 5], start: '17:30', end: '18:30', about: 'Judo throws, falls and self-defence. Soft mats for safe practice.', levels: 'Judo belts' },
	// Bengaluru
	{ name: 'Jayanagar Kathak Kendra', act: ['kathak'], city: 'Bengaluru', state: 'Karnataka', locality: 'Jayanagar', lat: 12.9299, lng: 77.5826, langs: ['Hindi', 'English', 'Kannada'], fee: 1800, days: [2, 4], start: '17:30', end: '19:00', about: 'Lucknow gharana Kathak for beginners and intermediate dancers.' },
	{ name: 'Indiranagar Kickboxing and Fitness', act: ['kickboxing', 'gym-training'], city: 'Bengaluru', state: 'Karnataka', locality: 'Indiranagar', lat: 12.9784, lng: 77.6408, langs: ['English', 'Hindi'], fee: 3000, days: [1, 2, 3, 4, 5], start: '19:00', end: '20:00', about: 'High-energy kickboxing and strength sessions for adults.', ages: ['adults'] },
	{ name: 'Koramangala Kids Football Academy', act: ['football'], city: 'Bengaluru', state: 'Karnataka', locality: 'Koramangala', lat: 12.9352, lng: 77.6245, langs: ['English', 'Kannada'], fee: 2200, days: [6, 0], start: '07:00', end: '08:30', about: 'Grassroots football for ages 6 to 16 on a full-size turf.', ages: ['kids', 'teens'] },
	{ name: 'Whitefield Abacus and Mental Maths', act: ['abacus'], city: 'Bengaluru', state: 'Karnataka', locality: 'Whitefield', lat: 12.9698, lng: 77.75, langs: ['English'], fee: 1300, days: [6], start: '15:00', end: '16:30', about: 'Abacus levels 1 to 8 for faster mental arithmetic.', ages: ['kids'], online: true },
	// Hyderabad
	{ name: 'Banjara Hills Kuchipudi Academy', act: ['kuchipudi'], city: 'Hyderabad', state: 'Telangana', locality: 'Banjara Hills', lat: 17.4156, lng: 78.4347, langs: ['Telugu', 'English'], fee: 1600, days: [1, 3], start: '17:00', end: '18:30', about: 'Kuchipudi classical dance with theory and abhinaya.' },
	{ name: 'Kukatpally Swimming Academy', act: ['swimming'], city: 'Hyderabad', state: 'Telangana', locality: 'Kukatpally', lat: 17.4849, lng: 78.4138, langs: ['Telugu', 'Hindi', 'English'], fee: 2400, days: [1, 2, 3, 4, 5, 6], start: '06:00', end: '07:00', about: 'Summer and year-round swimming with certified coaches.' },
	// Mumbai
	{ name: 'Andheri Bollywood Dance Studio', act: ['bollywood', 'hip-hop'], city: 'Mumbai', state: 'Maharashtra', locality: 'Andheri West', lat: 19.1364, lng: 72.8296, langs: ['Hindi', 'English', 'Marathi'], fee: 2500, days: [2, 4, 6], start: '19:00', end: '20:00', about: 'Fun Bollywood and hip-hop choreography for all levels.' },
	{ name: 'Dadar Mallakhamb Centre', act: ['mallakhamb', 'gymnastics'], city: 'Mumbai', state: 'Maharashtra', locality: 'Dadar', lat: 19.0178, lng: 72.8478, langs: ['Marathi', 'Hindi'], fee: 1200, days: [1, 2, 3, 4, 5], start: '06:30', end: '08:00', about: 'Traditional Indian pole and rope mallakhamb, plus floor gymnastics.' },
	// Delhi and Pune
	{ name: 'Lajpat Nagar Tabla Gharana', act: ['tabla'], city: 'Delhi', state: 'Delhi', locality: 'Lajpat Nagar', lat: 28.5677, lng: 77.2433, langs: ['Hindi', 'English', 'Punjabi'], fee: 1500, days: [2, 5], start: '17:00', end: '18:00', about: 'Tabla from basic bols to taals, Delhi gharana style.', online: true },
	{ name: 'Dwarka Gatka and Self-Defence', act: ['gatka', 'self-defence'], city: 'Delhi', state: 'Delhi', locality: 'Dwarka', lat: 28.5921, lng: 77.046, langs: ['Punjabi', 'Hindi'], fee: 800, days: [6, 0], start: '08:00', end: '09:30', about: 'Sikh martial art of gatka and practical self-defence for teenagers and adults.' },
	{ name: 'Kothrud Tennis Academy', act: ['tennis'], city: 'Pune', state: 'Maharashtra', locality: 'Kothrud', lat: 18.5074, lng: 73.8077, langs: ['Marathi', 'English'], fee: 2800, days: [1, 3, 5], start: '06:30', end: '08:00', about: 'Tennis coaching on clay courts, beginners to tournament level.' },
	// Kochi
	{ name: 'Kakkanad Kalaripayattu Sangham', act: ['kalaripayattu'], city: 'Kochi', state: 'Kerala', locality: 'Kakkanad', lat: 10.0159, lng: 76.3419, langs: ['Malayalam', 'English'], fee: 1000, days: [1, 3, 5], start: '06:00', end: '07:30', about: 'Kerala kalaripayattu: meipayattu, weapons and traditional exercises.' }
];

const REVIEWS = [
	'Very patient master. My son looks forward to every class.',
	'Clean place and classes start on time.',
	'Good discipline and friendly atmosphere.',
	'Fees are fair and the teaching is excellent.',
	'My daughter has become much more confident.',
	'Well organised, regular updates to parents.'
];
const STUDENT_NAMES = ['Karthik', 'Divya', 'Arjun', 'Priya', 'Sanjay', 'Keerthana', 'Vignesh', 'Ananya'];

async function add(db: DB) {
	const existing = await db.selectFrom('orgs').select(sql<number>`count(*)::int`.as('n')).where('is_sample', '=', true).executeTakeFirstOrThrow();
	if (existing.n > 0) {
		console.log(`${existing.n} sample classes are already there. Run npm run sample:remove first to add them again.`);
		return;
	}
	const acts = Object.fromEntries((await db.selectFrom('activity_nodes').select(['id', 'slug']).execute()).map((a) => [a.slug, a.id]));
	const systems = Object.fromEntries((await db.selectFrom('level_systems').select(['id', 'name']).where('org_id', 'is', null).execute()).map((s) => [s.name, s.id]));
	const today = new Date(Date.now() + 5.5 * 3_600_000).toISOString().slice(0, 10);
	let karate: { orgId: string; ownerId: string } | null = null;

	for (const [i, s] of SAMPLES.entries()) {
		const owner = await db
			.insertInto('persons')
			.values({ display_name: `Sample master ${i + 1}`, birth_date: '1985-01-01', is_sample: true })
			.returning('id')
			.executeTakeFirstOrThrow();
		const created = await createClass(db, owner.id, {
			name: s.name,
			activityIds: s.act.map((a) => acts[a]).filter((x): x is number => typeof x === 'number'),
			city: s.city,
			state: s.state,
			addressLine: `${10 + i}, ${s.locality} Main Road`,
			locality: s.locality,
			postalCode: null,
			lat: s.lat,
			lng: s.lng,
			precise: false,
			whatsapp: null, // no phone numbers: sample classes must never send people to a real person's number
			showWhatsapp: false,
			phone: null,
			showPhone: false,
			teachingLanguages: s.langs,
			ageGroups: s.ages ?? (s.women ? ['adults'] : ['kids', 'teens', 'adults']),
			upiId: null,
			batch: { name: s.days.length >= 5 ? 'Morning batch' : 'Regular batch', days: s.days, start: s.start, end: s.end, feePaise: s.fee * 100, feePeriod: 'month' }
		});
		await db
			.updateTable('orgs')
			.set({ is_sample: true, about: s.about, women_only: Boolean(s.women), online: Boolean(s.online), level_system_id: s.levels ? (systems[s.levels] ?? null) : null })
			.where('id', '=', created.id)
			.execute();
		if (i === 0) karate = { orgId: created.id, ownerId: owner.id };

		// A few students who came to class and left a review (reviews are only allowed after attending).
		const batch = await db.selectFrom('batches').select('id').where('org_id', '=', created.id).executeTakeFirstOrThrow();
		const session = await db.insertInto('class_sessions').values({ org_id: created.id, batch_id: batch.id, on_date: today }).returning('id').executeTakeFirstOrThrow();
		const count = 2 + (i % 4);
		for (let r = 0; r < count; r++) {
			const student = await db
				.insertInto('persons')
				.values({ display_name: STUDENT_NAMES[(i + r) % STUDENT_NAMES.length], birth_date: '1996-01-01', is_sample: true })
				.returning('id')
				.executeTakeFirstOrThrow();
			await db.insertInto('enrolments').values({ org_id: created.id, batch_id: batch.id, person_id: student.id, created_by: owner.id }).execute();
			await db.insertInto('attendance').values({ id: crypto.randomUUID(), org_id: created.id, session_id: session.id, person_id: student.id, status: 'present', marked_by: owner.id }).execute();
			await asPerson(db, student.id, (tx) =>
				tx.insertInto('reviews').values({ org_id: created.id, author_id: student.id, rating: (i + r) % 5 === 0 ? 4 : 5, body: REVIEWS[(i + r) % REVIEWS.length] }).execute()
			);
		}
		console.log(`added ${s.name}, ${s.city}`);
	}

	// Three months of history for the karate class, so its Insights, Fees and Levels pages are full.
	if (karate) {
		await addHistory(db, karate.orgId, karate.ownerId, today, { sample: true, nameSuffix: '', seed: 7 });
		await db.updateTable('persons').set({ is_sample: true }).where('id', 'in', db.selectFrom('enrolments').select('person_id').where('org_id', '=', karate.orgId)).execute();
		await db.updateTable('persons').set({ is_sample: true }).where('id', 'in', db.selectFrom('guardianships').select('guardian_id').where('child_id', 'in', db.selectFrom('enrolments').select('person_id').where('org_id', '=', karate.orgId))).execute();
		const email = process.env.SAMPLE_OWNER_EMAIL?.trim().toLowerCase();
		if (email) {
			const { rows } = await sql<{ id: string }>`
				select p.id from persons p join mc_auth."user" u on u.id = p.user_id where lower(u.email) = ${email}
			`.execute(db);
			if (rows[0]) {
				await db.insertInto('org_members').values({ org_id: karate.orgId, person_id: rows[0].id, role: 'admin' }).execute();
				console.log(`${email} is now an admin of the sample karate class (see it under "My page").`);
			} else {
				console.log(`No account found for ${email}. Sign in on the site once, then run: npm run sample:remove and npm run sample:add again.`);
			}
		}
	}
	console.log(`\nDone: ${SAMPLES.length} sample classes added to ${where}.`);
}

async function remove(db: DB) {
	const orgs = await db.selectFrom('orgs').select('id').where('is_sample', '=', true).execute();
	if (orgs.length) {
		// Removing the class removes its batches, students' enrolments, attendance, fees, reviews and enquiries.
		await db.deleteFrom('orgs').where('is_sample', '=', true).execute();
	}
	const people = await db.deleteFrom('persons').where('is_sample', '=', true).where('user_id', 'is', null).executeTakeFirst();
	console.log(`Removed ${orgs.length} sample classes and ${Number(people.numDeletedRows)} sample people from ${where}.`);
}

try {
	console.log(`Working on ${where}…`);
	if (mode === 'add') await add(db);
	else await remove(db);
} finally {
	await end();
}
