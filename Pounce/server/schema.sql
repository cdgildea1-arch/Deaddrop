-- Applied as migration pounce_chat_rooms on 2026-11-07 (project lecudeiafwhyhufceurv).
create table public.pounce_rooms_v1 (
 code text primary key check (code ~ '^[A-HJ-NP-Z2-9]{6}$'),
 host_hash text not null,
 guest_hash text,
 names jsonb not null default '["",""]'::jsonb,
 messages jsonb not null default '[]'::jsonb,
 rev integer not null default 0,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
alter table public.pounce_rooms_v1 enable row level security;
revoke all on public.pounce_rooms_v1 from public, anon, authenticated;
grant select, insert, update, delete on public.pounce_rooms_v1 to service_role;
