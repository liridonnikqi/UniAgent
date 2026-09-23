import { env } from '$env/dynamic/private';
import postgres from 'postgres';
import type { ChatMessage, ChatSession } from '$lib/types';

let client: ReturnType<typeof postgres> | null = null;
let ready = false;

export function db() {
	if (!env.DATABASE_URL) {
		throw new Error('Missing DATABASE_URL in .env');
	}

	if (!client) {
		client = postgres(env.DATABASE_URL, {
			max: 5,
			connect_timeout: 5,
			onnotice: () => {}
		});
	}

	return client;
}

export type User = {
	id: string;
	name: string | null;
	email: string | null;
	university: string | null;
};

export async function ensureSchema() {
	if (ready) return;
	const sql = db();

	await sql`
		create table if not exists users (
			id uuid primary key,
			name text,
			university text,
			created_at timestamptz not null default now()
		)
	`;
	await sql`
		create table if not exists sessions (
			id uuid primary key default gen_random_uuid(),
			user_id uuid not null references users (id) on delete cascade,
			title text not null default 'Bisedë e re',
			created_at timestamptz not null default now(),
			updated_at timestamptz not null default now()
		)
	`;
	await sql`
		create table if not exists messages (
			id uuid primary key default gen_random_uuid(),
			user_id uuid not null references users (id) on delete cascade,
			role text not null check (role in ('user', 'assistant')),
			content text not null,
			created_at timestamptz not null default now()
		)
	`;
	await sql`alter table messages add column if not exists session_id uuid`;
	await sql`alter table users add column if not exists email text`;
	await sql`alter table users add column if not exists email_verified boolean not null default false`;
	await sql`alter table users add column if not exists image text`;
	await sql`alter table users add column if not exists updated_at timestamptz not null default now()`;
	await sql`create unique index if not exists users_email_unique on users (email)`;
	await sql`alter table users alter column id set default gen_random_uuid()`;

	await sql`
		create table if not exists auth_session (
			id uuid primary key default gen_random_uuid(),
			expires_at timestamptz not null,
			token text not null unique,
			created_at timestamptz not null default now(),
			updated_at timestamptz not null default now(),
			ip_address text,
			user_agent text,
			user_id uuid not null references users (id) on delete cascade
		)
	`;
	await sql`create index if not exists auth_session_user_id_idx on auth_session (user_id)`;

	await sql`
		create table if not exists auth_account (
			id uuid primary key default gen_random_uuid(),
			account_id text not null,
			provider_id text not null,
			user_id uuid not null references users (id) on delete cascade,
			access_token text,
			refresh_token text,
			id_token text,
			access_token_expires_at timestamptz,
			refresh_token_expires_at timestamptz,
			scope text,
			password text,
			created_at timestamptz not null default now(),
			updated_at timestamptz not null default now()
		)
	`;
	await sql`create index if not exists auth_account_user_id_idx on auth_account (user_id)`;

	await sql`
		create table if not exists auth_verification (
			id uuid primary key default gen_random_uuid(),
			identifier text not null,
			value text not null,
			expires_at timestamptz not null,
			created_at timestamptz not null default now(),
			updated_at timestamptz not null default now()
		)
	`;
	await sql`alter table auth_session alter column id set default gen_random_uuid()`;
	await sql`alter table auth_account alter column id set default gen_random_uuid()`;
	await sql`alter table auth_verification alter column id set default gen_random_uuid()`;

	const orphans = await sql<{ user_id: string }[]>`
		select distinct user_id
		from messages
		where session_id is null
	`;

	for (const row of orphans) {
		const [session] = await sql<{ id: string }[]>`
			insert into sessions (user_id, title)
			values (${row.user_id}, 'Bisedë')
			returning id
		`;
		await sql`
			update messages
			set session_id = ${session.id}
			where user_id = ${row.user_id} and session_id is null
		`;
	}

	ready = true;
}

export async function getUser(id: string): Promise<User | null> {
	const sql = db();
	const rows = await sql<User[]>`
		select id, name, email, university
		from users
		where id = ${id}
	`;
	return rows[0] ?? null;
}

export async function saveProfile(id: string, name: string, university: string) {
	const sql = db();
	await sql`
		update users
		set name = ${name}, university = ${university}, updated_at = now()
		where id = ${id}
	`;
}

export async function listSessions(userId: string): Promise<ChatSession[]> {
	const sql = db();
	return sql<ChatSession[]>`
		select s.id, s.title, s.updated_at
		from sessions s
		where s.user_id = ${userId}
			and exists (
				select 1
				from messages m
				where m.session_id = s.id and m.role = 'assistant'
			)
		order by s.updated_at desc
	`;
}

export async function deleteEmptySessions(userId: string) {
	const sql = db();
	await sql`
		delete from sessions s
		where s.user_id = ${userId}
			and not exists (
				select 1 from messages m where m.session_id = s.id
			)
	`;
}

export async function createSession(userId: string, title = 'Bisedë e re') {
	const sql = db();
	const [session] = await sql<ChatSession[]>`
		insert into sessions (user_id, title)
		values (${userId}, ${title})
		returning id, title, updated_at
	`;
	return session;
}

export async function getSession(id: string, userId: string) {
	const sql = db();
	const rows = await sql<ChatSession[]>`
		select id, title, updated_at
		from sessions
		where id = ${id} and user_id = ${userId}
	`;
	return rows[0] ?? null;
}

export async function deleteSession(id: string, userId: string) {
	const sql = db();
	await sql`
		delete from messages
		where session_id = ${id} and user_id = ${userId}
	`;
	await sql`
		delete from sessions
		where id = ${id} and user_id = ${userId}
	`;
}

const PAGE = 40;

type MessageRow = {
	id: string;
	role: ChatMessage['role'];
	content: string;
	created_at: Date | string;
};

function mapMessage(row: MessageRow): ChatMessage {
	return {
		id: row.id,
		role: row.role,
		content: row.content,
		created_at:
			row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at)
	};
}

export async function listMessages(sessionId: string): Promise<ChatMessage[]> {
	const sql = db();
	const rows = await sql<MessageRow[]>`
		select id, role, content, created_at
		from messages
		where session_id = ${sessionId}
		order by created_at
	`;
	return rows.map(mapMessage);
}

export async function listRecentMessages(sessionId: string, limit = 20): Promise<ChatMessage[]> {
	const sql = db();
	const rows = await sql<MessageRow[]>`
		select id, role, content, created_at
		from messages
		where session_id = ${sessionId}
		order by created_at desc
		limit ${limit}
	`;
	return rows.reverse().map(mapMessage);
}

export async function listMessageWindow(
	sessionId: string,
	before?: string,
	limit = PAGE
): Promise<{ messages: ChatMessage[]; hasMore: boolean }> {
	const sql = db();
	const rows = before
		? await sql<MessageRow[]>`
				select id, role, content, created_at
				from messages
				where session_id = ${sessionId} and created_at < ${before}
				order by created_at desc
				limit ${limit + 1}
			`
		: await sql<MessageRow[]>`
				select id, role, content, created_at
				from messages
				where session_id = ${sessionId}
				order by created_at desc
				limit ${limit + 1}
			`;

	const hasMore = rows.length > limit;
	const page = hasMore ? rows.slice(0, limit) : rows;
	return { messages: page.reverse().map(mapMessage), hasMore };
}

export async function addMessage(
	userId: string,
	sessionId: string,
	role: ChatMessage['role'],
	content: string
) {
	const sql = db();
	await sql`
		insert into messages (user_id, session_id, role, content)
		values (${userId}, ${sessionId}, ${role}, ${content})
	`;
	await sql`
		update sessions
		set updated_at = now()
		where id = ${sessionId}
	`;
}

export async function setSessionTitleFromFirstQuestion(sessionId: string) {
	const sql = db();
	const rows = await sql<{ content: string }[]>`
		select content
		from messages
		where session_id = ${sessionId} and role = 'user'
		order by created_at
		limit 1
	`;
	const text = rows[0]?.content?.trim();
	if (!text) return;

	const title = text.length > 36 ? `${text.slice(0, 36)}…` : text;
	await sql`
		update sessions
		set title = ${title}, updated_at = now()
		where id = ${sessionId}
	`;
}
