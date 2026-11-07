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

-- Applied as migration pounce_reserved_room_25800852 on 2026-11-07.
alter table public.pounce_rooms_v1 drop constraint pounce_rooms_v1_code_check;
alter table public.pounce_rooms_v1 add constraint pounce_rooms_v1_code_check check (code ~ '^(?:[A-HJ-NP-Z2-9]{6}|[0-9]{8})$');
insert into public.pounce_rooms_v1 (code, host_hash) values ('25800852', 'unclaimed') on conflict (code) do nothing;

-- Applied as migration pounce_live_channel_key on 2026-11-07.
alter table public.pounce_rooms_v1 add column live text not null default replace(gen_random_uuid()::text, '-', '');

-- 2026-11-07: room 25800852 reset to unclaimed (migration pounce_reset_room_25800852).
