-- Saved games for Your Move. One row per room code and game.
-- RLS is on with no policies: only the your-move-games Edge Function (service role) reads or writes it.
create table if not exists public.your_move_games (
  code text not null,
  game text not null,
  live text not null,              -- the room's live key; a reset room gets a new key, which retires old saves
  state jsonb not null,            -- full game (turn games) or the first phone's snapshot (live games)
  rev integer not null default 0,  -- bumps on every saved move so two phones can't overwrite each other
  updated_at timestamptz not null default now(),
  primary key (code, game)
);
alter table public.your_move_games enable row level security;
revoke all on public.your_move_games from anon, authenticated;

-- Chat kill switch: per-seat "cleared up to" times, so a cleared chat stays gone for that person on every device.
alter table public.pounce_rooms_v1 add column if not exists cleared jsonb not null default '{}'::jsonb;
