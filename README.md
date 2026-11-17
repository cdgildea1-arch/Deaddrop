# LPC Learning Studio (prototype)

Static, single-file learning-management prototype served at `/LPC` on Vercel.
All people and records are **fictional**; data is stored only in the visitor's browser.
Not CE-approved; awards no supervised-experience, practicum, or internship hours.

## Layout
- `LPC/index.html` – built app (what Vercel serves)
- `src/` – source parts (`style.css`, `content.js`, `core.js`, `student.js`, `staff.js`, `router.js`)
- `build.py` – concatenates `src/` into `dist/LPC/index.html` (copy to `LPC/index.html`)
- `supabase/migrations/0001_lpc_core_schema.sql` – DRAFT schema + RLS for a separate Supabase project (not applied)
- `index.html` – redirects `/` to `/LPC`; `vercel.json` – rewrites for `/LPC`

## Portals
- Student: modules, branching simulations, knowledge checks, reflections, progress
- Supervisor: dashboard, students, review queue, curriculum editor, supervision records, reports
- Admin: users/roles, plans (not connected), CE-claim guardrails, settings
