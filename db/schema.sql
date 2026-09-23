create table if not exists users (
	id uuid primary key,
	name text,
	email text unique,
	email_verified boolean not null default false,
	image text,
	university text,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create table if not exists sessions (
	id uuid primary key default gen_random_uuid(),
	user_id uuid not null references users (id) on delete cascade,
	title text not null default 'Bisedë e re',
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create table if not exists messages (
	id uuid primary key default gen_random_uuid(),
	user_id uuid not null references users (id) on delete cascade,
	session_id uuid references sessions (id) on delete cascade,
	role text not null check (role in ('user', 'assistant')),
	content text not null,
	created_at timestamptz not null default now()
);

create table if not exists auth_session (
	id uuid primary key default gen_random_uuid(),
	expires_at timestamptz not null,
	token text not null unique,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	ip_address text,
	user_agent text,
	user_id uuid not null references users (id) on delete cascade
);

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
);

create table if not exists auth_verification (
	id uuid primary key default gen_random_uuid(),
	identifier text not null,
	value text not null,
	expires_at timestamptz not null,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create index if not exists sessions_user_updated_idx on sessions (user_id, updated_at desc);
create index if not exists messages_session_created_idx on messages (session_id, created_at);
create index if not exists auth_session_user_id_idx on auth_session (user_id);
create index if not exists auth_account_user_id_idx on auth_account (user_id);
