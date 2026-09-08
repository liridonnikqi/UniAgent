create table if not exists users (
	id uuid primary key,
	name text,
	university text,
	created_at timestamptz not null default now()
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

create index if not exists sessions_user_updated_idx on sessions (user_id, updated_at desc);
create index if not exists messages_session_created_idx on messages (session_id, created_at);
