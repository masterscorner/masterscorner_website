// Enquiries from the public class page, and reviews with the teacher's replies.
import { sql } from 'kysely';
import { asPerson, type DB } from '../db-core.ts';

export type EnquiryStatus = 'new' | 'contacted' | 'trial_booked' | 'joined' | 'closed';

export interface Enquiry {
	id: string;
	name: string;
	phone_e164: string;
	message: string | null;
	for_child: boolean;
	status: EnquiryStatus;
	note: string | null;
	created_at: string;
}

export function listEnquiries(db: DB, personId: string, orgId: string): Promise<Enquiry[]> {
	return asPerson(db, personId, (tx) =>
		tx
			.selectFrom('enquiries')
			.select(['id', 'name', 'phone_e164', 'message', 'for_child', 'status', 'note', sql<string>`to_char(created_at at time zone 'Asia/Kolkata', 'YYYY-MM-DD')`.as('created_at')])
			.where('org_id', '=', orgId)
			.orderBy(sql`status in ('joined', 'closed')`)
			.orderBy('created_at', 'desc')
			.limit(200)
			.execute()
	);
}

export function updateEnquiry(db: DB, personId: string, orgId: string, id: string, status: EnquiryStatus, note: string | null) {
	return asPerson(db, personId, async (tx) => {
		const res = await tx.updateTable('enquiries').set({ status, note }).where('id', '=', id).where('org_id', '=', orgId).executeTakeFirst();
		if (Number(res.numUpdatedRows) === 0) throw new Error('Not allowed');
	});
}

export function newEnquiryCount(db: DB, personId: string, orgId: string): Promise<number> {
	return asPerson(db, personId, async (tx) => {
		const r = await tx.selectFrom('enquiries').select(sql<number>`count(*)::int`.as('n')).where('org_id', '=', orgId).where('status', '=', 'new').executeTakeFirst();
		return r?.n ?? 0;
	});
}

export interface ReviewRow {
	id: string;
	rating: number;
	body: string | null;
	author: string;
	created_at: string;
	reply: string | null;
}

export function listReviews(db: DB, personId: string, orgId: string): Promise<ReviewRow[]> {
	return asPerson(db, personId, async (tx) => {
		const { rows } = await sql<ReviewRow>`
			select r.id, r.rating, r.body, r.author_name as author, to_char(r.created_at, 'YYYY-MM-DD') as created_at, rr.body as reply
			from reviews r left join review_replies rr on rr.review_id = r.id
			where r.org_id = ${orgId} and r.status = 'published'
			order by r.created_at desc limit 200
		`.execute(tx);
		return rows;
	});
}

export function replyToReview(db: DB, personId: string, orgId: string, reviewId: string, body: string | null) {
	return asPerson(db, personId, async (tx) => {
		const review = await tx.selectFrom('reviews').select('id').where('id', '=', reviewId).where('org_id', '=', orgId).executeTakeFirst();
		if (!review) throw new Error('Not found');
		if (!body) {
			await tx.deleteFrom('review_replies').where('review_id', '=', reviewId).execute();
			return;
		}
		await tx
			.insertInto('review_replies')
			.values({ review_id: reviewId, body, replied_by: personId })
			.onConflict((oc) => oc.column('review_id').doUpdateSet({ body, replied_by: personId, created_at: sql`now()` }))
			.execute();
	});
}
