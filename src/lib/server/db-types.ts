// Kysely table types. Keep in step with db/migrations (the SQL files are the source of truth).
import type { ColumnType, Generated } from 'kysely';

type Timestamp = ColumnType<Date, Date | string | undefined, Date | string>;
type DateOnly = ColumnType<string, string | undefined, string>;
type Num = ColumnType<string | null, number | string | null, number | string | null>;
type Geo = ColumnType<string, string, string>;

export interface PersonsTable {
	id: Generated<string>;
	user_id: string | null;
	display_name: string;
	phone_e164: string | null;
	birth_date: string | null;
	is_minor: Generated<boolean>;
	created_by: string | null;
	created_at: Generated<Timestamp>;
	updated_at: Generated<Timestamp>;
	deleted_at: Timestamp | null;
}

export interface ActivityNodesTable {
	id: Generated<number>;
	parent_id: number | null;
	kind: 'category' | 'discipline' | 'style';
	slug: string;
	name: string;
	emoji: string | null;
	sort: Generated<number>;
	status: Generated<'approved' | 'suggested' | 'rejected'>;
}

export interface OrgsTable {
	id: Generated<string>;
	slug: string;
	name: string;
	about: string | null;
	owner_id: string;
	country: Generated<string>;
	currency: Generated<string>;
	timezone: Generated<string>;
	phone_e164: string | null;
	show_phone: Generated<boolean>;
	whatsapp_e164: string | null;
	show_whatsapp: Generated<boolean>;
	email: string | null;
	show_email: Generated<boolean>;
	upi_id: string | null;
	teaching_languages: Generated<string[]>;
	age_groups: Generated<string[]>;
	women_only: Generated<boolean>;
	offers_trial: Generated<boolean>;
	online: Generated<boolean>;
	fee_min_paise: number | null;
	fee_max_paise: number | null;
	logo_key: string | null;
	cover_key: string | null;
	status: Generated<'draft' | 'published' | 'suspended'>;
	rating_avg: Num;
	rating_count: Generated<number>;
	level_system_id: number | null;
	fee_due_day: Generated<number>;
	created_at: Generated<Timestamp>;
	updated_at: Generated<Timestamp>;
}

export type StaffRole = 'owner' | 'admin' | 'instructor';

export interface OrgMembersTable {
	org_id: string;
	person_id: string;
	role: StaffRole;
	status: Generated<'invited' | 'active' | 'removed'>;
	created_at: Generated<Timestamp>;
}

export interface OrgActivitiesTable {
	org_id: string;
	activity_id: number;
}

export interface LevelSystemsTable {
	id: Generated<number>;
	activity_id: number | null;
	org_id: string | null;
	name: string;
}

export interface LevelsTable {
	id: Generated<number>;
	system_id: number;
	position: number;
	name: string;
	color: string | null;
}

export interface BranchesTable {
	id: Generated<string>;
	org_id: string;
	name: Generated<string>;
	address_line: string;
	locality: string | null;
	city: string;
	state: string | null;
	postal_code: string | null;
	country: Generated<string>;
	location: Geo;
	location_precise: Generated<boolean>;
	created_at: Generated<Timestamp>;
}

export interface GuardianshipsTable {
	id: Generated<string>;
	child_id: string;
	guardian_id: string | null;
	invited_phone: string | null;
	relationship: Generated<'parent' | 'guardian'>;
	status: Generated<'pending' | 'active' | 'revoked'>;
	invited_by_org: string | null;
	created_at: Generated<Timestamp>;
	confirmed_at: Timestamp | null;
	revoked_at: Timestamp | null;
}

export interface BatchesTable {
	id: Generated<string>;
	org_id: string;
	branch_id: string | null;
	name: string;
	activity_id: number | null;
	days: number[];
	start_time: string;
	end_time: string;
	capacity: number | null;
	fee_paise: number | null;
	fee_period: Generated<'month' | 'quarter' | 'term' | 'class'>;
	online_url: string | null;
	instructor_id: string | null;
	active: Generated<boolean>;
	created_at: Generated<Timestamp>;
}

export interface ClassSessionsTable {
	id: Generated<string>;
	org_id: string;
	batch_id: string;
	on_date: DateOnly;
	status: Generated<'scheduled' | 'cancelled'>;
}

export type EnrolmentStatus = 'pending_consent' | 'trial' | 'active' | 'paused' | 'left';

export interface EnrolmentsTable {
	id: Generated<string>;
	org_id: string;
	batch_id: string;
	person_id: string;
	status: Generated<EnrolmentStatus>;
	joined_on: ColumnType<string, string | undefined, string>;
	left_on: string | null;
	created_by: string | null;
	created_at: Generated<Timestamp>;
}

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

export interface AttendanceTable {
	id: string;
	org_id: string;
	session_id: string;
	person_id: string;
	status: AttendanceStatus;
	method: Generated<'list' | 'qr' | 'online'>;
	marked_by: string | null;
	marked_at: Generated<Timestamp>;
}

export interface InvoicesTable {
	id: Generated<string>;
	org_id: string;
	person_id: string;
	batch_id: string | null;
	period_label: string;
	period_start: string;
	amount_paise: number;
	currency: Generated<string>;
	due_on: string;
	status: Generated<'due' | 'paid' | 'waived' | 'cancelled'>;
	created_at: Generated<Timestamp>;
}

export interface PaymentsTable {
	id: Generated<string>;
	org_id: string;
	invoice_id: string | null;
	person_id: string;
	amount_paise: number;
	currency: Generated<string>;
	method: 'cash' | 'upi' | 'bank' | 'other';
	reference: string | null;
	reverses: string | null;
	recorded_by: string | null;
	recorded_at: Generated<Timestamp>;
}

export interface PaymentClaimsTable {
	id: Generated<string>;
	org_id: string;
	invoice_id: string;
	claimed_by: string;
	reference: string | null;
	status: Generated<'pending' | 'accepted' | 'rejected'>;
	created_at: Generated<Timestamp>;
	decided_at: Timestamp | null;
	decided_by: string | null;
}

export interface PhotosTable {
	id: Generated<string>;
	org_id: string;
	branch_id: string | null;
	storage_key: string;
	alt_text: string;
	width: number | null;
	height: number | null;
	is_public: Generated<boolean>;
	shows_children: Generated<boolean>;
	sort: Generated<number>;
	created_at: Generated<Timestamp>;
}

export interface ReviewsTable {
	id: Generated<string>;
	org_id: string;
	author_id: string;
	author_name: Generated<string>;
	rating: number;
	body: string | null;
	status: Generated<'published' | 'hidden' | 'removed'>;
	created_at: Generated<Timestamp>;
	updated_at: Generated<Timestamp>;
}

export interface ReviewRepliesTable {
	review_id: string;
	body: string;
	replied_by: string | null;
	created_at: Generated<Timestamp>;
}

export interface EnquiriesTable {
	id: Generated<string>;
	org_id: string;
	name: string;
	phone_e164: string;
	message: string | null;
	for_child: Generated<boolean>;
	status: Generated<'new' | 'contacted' | 'trial_booked' | 'joined' | 'closed'>;
	person_id: string | null;
	note: string | null;
	created_at: Generated<Timestamp>;
	updated_at: Generated<Timestamp>;
}

export interface GradeAwardsTable {
	id: Generated<string>;
	org_id: string;
	person_id: string;
	level_id: number;
	awarded_on: ColumnType<string, string | undefined, string>;
	awarded_by: string | null;
	note: string | null;
	revoked_at: Timestamp | null;
	revoked_by: string | null;
	created_at: Generated<Timestamp>;
}

export interface StaffInvitesTable {
	id: Generated<string>;
	org_id: string;
	phone_e164: string;
	role: 'admin' | 'instructor';
	invited_by: string | null;
	created_at: Generated<Timestamp>;
	accepted_at: Timestamp | null;
	revoked_at: Timestamp | null;
}

export interface NoticesTable {
	id: Generated<string>;
	org_id: string;
	batch_id: string | null;
	title: string;
	body: string | null;
	created_by: string | null;
	created_at: Generated<Timestamp>;
}

export interface ReportsTable {
	id: Generated<string>;
	target_type: 'org' | 'review' | 'photo' | 'person' | 'safety';
	target_id: string | null;
	reason: 'fake' | 'abusive' | 'privacy' | 'impersonation' | 'copyright' | 'child_safety' | 'other';
	details: string | null;
	reporter_id: string | null;
	reporter_phone: string | null;
	status: Generated<'open' | 'acknowledged' | 'resolved' | 'rejected'>;
	created_at: Generated<Timestamp>;
	acknowledged_at: Timestamp | null;
	resolved_at: Timestamp | null;
}

export interface ConsentsTable {
	id: Generated<string>;
	subject_id: string;
	given_by: string;
	org_id: string | null;
	purpose: 'platform_account' | 'class_records' | 'public_profile' | 'whatsapp_messages';
	notice_version: string;
	method: 'otp_self' | 'otp_guardian_declaration' | 'digilocker';
	given_at: Generated<Timestamp>;
	withdrawn_at: Timestamp | null;
}

export interface AuditLogTable {
	id: Generated<number>;
	at: Generated<Timestamp>;
	actor_id: string | null;
	org_id: string | null;
	action: string;
	target_type: string | null;
	target_id: string | null;
	details: unknown | null;
}

export interface ListingsView {
	id: string;
	slug: string;
	name: string;
	about: string | null;
	country: string;
	currency: string;
	phone_e164: string | null;
	whatsapp_e164: string | null;
	email: string | null;
	teaching_languages: string[];
	age_groups: string[];
	women_only: boolean;
	offers_trial: boolean;
	online: boolean;
	fee_min_paise: number | null;
	fee_max_paise: number | null;
	logo_key: string | null;
	cover_key: string | null;
	rating_avg: string | null;
	rating_count: number;
	level_system_id: number | null;
	branch_id: string;
	address_line: string;
	locality: string | null;
	city: string;
	state: string | null;
	postal_code: string | null;
	location: string;
	location_precise: boolean;
}

export interface Database {
	persons: PersonsTable;
	activity_nodes: ActivityNodesTable;
	orgs: OrgsTable;
	org_members: OrgMembersTable;
	org_activities: OrgActivitiesTable;
	level_systems: LevelSystemsTable;
	levels: LevelsTable;
	branches: BranchesTable;
	guardianships: GuardianshipsTable;
	batches: BatchesTable;
	class_sessions: ClassSessionsTable;
	enrolments: EnrolmentsTable;
	attendance: AttendanceTable;
	invoices: InvoicesTable;
	payments: PaymentsTable;
	payment_claims: PaymentClaimsTable;
	photos: PhotosTable;
	reviews: ReviewsTable;
	review_replies: ReviewRepliesTable;
	enquiries: EnquiriesTable;
	notices: NoticesTable;
	reports: ReportsTable;
	consents: ConsentsTable;
	audit_log: AuditLogTable;
	grade_awards: GradeAwardsTable;
	staff_invites: StaffInvitesTable;
	listings: ListingsView;
}
