# Pounce chat rooms

`index.ts` is the deployed Supabase Edge Function `pounce-chat` (project `lecudeiafwhyhufceurv`, JWT verification off because the function authenticates requests itself). `schema.sql` records the applied table.

One player starts a room and gets a 6-character code. The first other device to join with that code takes the second seat, and after that the room is full. Each device makes its own random 96-bit seat key, which stays in that device's localStorage. Only SHA-256 hashes of the keys are stored. The table has RLS on and no public grants, so only the function's service role can read or write it. Each room keeps its latest 300 messages. The app polls every 2s while the chat is open and every 5s otherwise.

Room `25800852` is reserved and is the default in the app. It was created with `host_hash = 'unclaimed'`. The first phone to join takes seat 1 and the second phone takes seat 2. After that the room is full. A phone that loses its saved key (new phone, cleared Safari data) can't get back in. To reset the room, set `host_hash = 'unclaimed'`, `guest_hash = null`, `names = '["",""]'` and `messages = '[]'` for that code.

## Live games

The room view also returns `live`, a random key that only the two seated phones receive. Both phones join the Supabase Realtime broadcast channel `pounce-live-<live>`. The room's first seat is the host: it deals, keeps the authoritative board, and resolves races for the same center pile. The second seat plays immediately on its own phone, sends each move to the host, and replaces its board with the host's whenever the host's copy arrives, then replays any moves the host hasn't confirmed yet. Presence tracks who is in the lobby or in a game and whether they are ready. The host saves the match in localStorage, so a reloaded phone picks up where it left off.

## Resetting a room

`op: 'reset'` empties both seats and the messages and issues a new `live` key, which cuts off both phones. A seated phone can reset its room. Anyone can reset a reserved 8-digit room (it goes back to `unclaimed`), so a lost or stale phone can't lock it. The app offers this as "Cancel game and reset room" in the lobby and the live pause menu, and as "Reset room 25800852" when a join finds the room full.
