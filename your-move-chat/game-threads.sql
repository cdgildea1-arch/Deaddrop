-- Keep game messages separate from the existing shared message history.
alter table public.pounce_rooms_v1
  add column if not exists game_threads jsonb not null default '{}'::jsonb;
