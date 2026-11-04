# Saved Mahjong rooms

`index.ts` and `engine.js` are the deployed Supabase Edge Function `mahjong-rooms` on project `lecudeiafwhyhufceurv`. `schema.sql` records the matching applied schema. The frontend calls the function from `../index.html`.

Deploy with JWT verification disabled because this function performs its own capability authentication: an 8-digit room code (when reserved) or random 96-bit invite code, plus an independent 96-bit device seat key. Only SHA-256 seat hashes are stored server-side. A room invite allows the first guest to claim the second seat. Further joins require an existing seat key. The UI saves each device key in localStorage, never in an invite URL. Changing device/browser or clearing site data requires a new room. No account or seat recovery is implemented.

Database rows have RLS enabled and no public policies or table grants. Only the Edge Function's server-side service role reads or writes rows. The service role key is taken from Supabase's runtime environment and is never included in frontend code.

Moves are reduced on the server using the same game engines, with optimistic revision checks on every write. Failed or stale moves cannot overwrite a newer board. Rooms remain saved between rounds; messages retain the latest 500 entries. Clear conversation only hides a user's local copy. The frontend polls while visible and refreshes when returning to the app.

Validation: `node test-rooms.mjs` creates isolated test rooms and checks offline joins, all three levels, fixed player seats, stale-write rejection, room-full errors, and saved messages. This test needs network access to the deployed function.

Reserved rooms are provisioned with host_hash set to `unclaimed` and game `{}`. The first join atomically claims the host seat and initializes the selected game. No player is preassigned by an administrator. An 8-digit code is easier to guess than a random invite, so share it only with your opponent. Existing 24-character codes continue to work.
