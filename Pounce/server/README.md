# Pounce chat rooms

`index.ts` is the deployed Supabase Edge Function `pounce-chat` (project `lecudeiafwhyhufceurv`, JWT verification off because the function authenticates requests itself). `schema.sql` records the applied table.

One player starts a room and gets a 6-character code. The first other device to join with that code takes the second seat, and after that the room is full. Each device makes its own random 96-bit seat key, which stays in that device's localStorage. Only SHA-256 hashes of the keys are stored. The table has RLS on and no public grants, so only the function's service role can read or write it. Each room keeps its latest 300 messages. The app polls every 2s while the chat is open and every 5s otherwise.

Room `25800852` is reserved and is the default in the app. It was created with `host_hash = 'unclaimed'`. The first phone to join takes seat 1 and the second phone takes seat 2. After that the room is full. A phone that loses its saved key (new phone, cleared Safari data) can't get back in. To reset the room, set `host_hash = 'unclaimed'`, `guest_hash = null`, `names = '["",""]'` and `messages = '[]'` for that code.
