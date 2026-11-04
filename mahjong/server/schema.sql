-- Applied as migration mahjong_saved_rooms on 2026-11-04.
create table public.mahjong_rooms_v2 (
 code text primary key check(code ~ '^(?:[0-9]{8}|[a-f0-9]{24})$'),
 host_hash text not null,
 guest_hash text,
 game jsonb not null,
 messages jsonb not null default '[]'::jsonb,
 rev integer not null default 0,
 updated_at timestamptz not null default now()
);
alter table public.mahjong_rooms_v2 enable row level security;
revoke all on public.mahjong_rooms_v2 from public,anon,authenticated;
grant select,insert,update,delete on public.mahjong_rooms_v2 to service_role;
