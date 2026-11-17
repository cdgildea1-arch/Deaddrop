-- (Guards allow changes when auth.uid() is null: migrations, SQL editor, service-role server code.)
-- =====================================================================
-- LPC Learning Studio — core LMS schema with row-level security
-- Target: a NEW, ISOLATED Supabase project (do not apply to "Dead drop").
-- Status: DRAFT — reviewed locally against Postgres 16 with stubbed auth;
--         not applied to any Supabase project.
-- =====================================================================

-- ---------- enums ----------
create type public.app_role        as enum ('student','instructor','admin');
create type public.course_status   as enum ('draft','published','archived');
create type public.approval_status as enum ('not_approved','pending','approved');
create type public.lesson_type     as enum ('text','video','file','worksheet','sort','sequence','rewrite');
create type public.reflection_status as enum ('awaiting','reviewed','revise');
create type public.meeting_type    as enum ('individual','group');
create type public.meeting_status  as enum ('scheduled','completed','canceled');

-- ---------- people ----------
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text not null,
  role        public.app_role not null default 'student',
  credential  text,                       -- e.g. 'LPC Associate', 'LPC-S'
  practice_setting text,
  created_at  timestamptz not null default now()
);

-- supervisor <-> supervisee relationship (education platform relationship;
-- NOT a substitute for the board-filed supervisory agreement)
create table public.supervision_assignments (
  supervisor_id uuid not null references public.profiles(id) on delete cascade,
  student_id    uuid not null references public.profiles(id) on delete cascade,
  active        boolean not null default true,
  created_at    timestamptz not null default now(),
  primary key (supervisor_id, student_id)
);

-- ---------- curriculum ----------
create table public.courses (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  description   text,
  status        public.course_status not null default 'draft',
  pass_score    int  not null default 80 check (pass_score between 50 and 100),
  hours_label   text,                     -- display only; never "CE hours" unless approved
  price_cents   int  not null default 0 check (price_cents >= 0),
  approval      public.approval_status not null default 'not_approved',
  approval_body text,                     -- e.g. 'NBCC ACEP #____' — required when approved
  created_by    uuid references public.profiles(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint approval_needs_body check (approval <> 'approved' or coalesce(length(approval_body),0) > 3)
);

create table public.course_instructors (
  course_id     uuid not null references public.courses(id) on delete cascade,
  instructor_id uuid not null references public.profiles(id) on delete cascade,
  primary key (course_id, instructor_id)
);

create table public.modules (
  id            uuid primary key default gen_random_uuid(),
  course_id     uuid not null references public.courses(id) on delete cascade,
  position      int  not null,
  title         text not null,
  category      text,
  summary       text,
  objectives    text[] not null default '{}',
  est_minutes   int,
  prerequisite_module_id uuid references public.modules(id) on delete set null,
  reflection_prompt text,
  scenario      jsonb,                    -- branching simulation graph
  unique (course_id, position) deferrable initially deferred
);

create table public.lessons (
  id           uuid primary key default gen_random_uuid(),
  module_id    uuid not null references public.modules(id) on delete cascade,
  position     int  not null,
  type         public.lesson_type not null,
  title        text not null,
  body         jsonb not null default '{}'::jsonb,  -- html / exercise definition
  storage_path text,                               -- private bucket 'course-media'
  unique (module_id, position) deferrable initially deferred
);

-- answer key lives here; students never get SELECT on this table
create table public.quiz_questions (
  id            uuid primary key default gen_random_uuid(),
  module_id     uuid not null references public.modules(id) on delete cascade,
  position      int  not null,
  prompt        text not null,
  options       text[] not null check (array_length(options,1) between 2 and 6),
  correct_index int  not null,
  explanation   text
);

-- ---------- learner records ----------
create table public.enrollments (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  course_id   uuid not null references public.courses(id) on delete cascade,
  module_ids  uuid[],                     -- null = whole course
  assigned_by uuid references public.profiles(id),
  due_at      timestamptz,
  source      text not null default 'assigned' check (source in ('assigned','purchase','admin')),
  created_at  timestamptz not null default now(),
  unique (user_id, course_id)
);

create table public.module_progress (
  user_id        uuid not null references public.profiles(id) on delete cascade,
  module_id      uuid not null references public.modules(id) on delete cascade,
  completed_steps text[] not null default '{}',
  position       int not null default 0,
  sim_state      jsonb,
  exercise_state jsonb,
  completed_at   timestamptz,
  updated_at     timestamptz not null default now(),
  primary key (user_id, module_id)
);

create table public.quiz_attempts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  module_id   uuid not null references public.modules(id) on delete cascade,
  answers     int[] not null,
  score       int not null check (score between 0 and 100),
  passed      boolean not null,
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  created_at  timestamptz not null default now()
);

create table public.reflections (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  module_id    uuid not null references public.modules(id) on delete cascade,
  body         text not null check (length(body) between 20 and 10000),
  status       public.reflection_status not null default 'awaiting',
  submitted_at timestamptz not null default now(),
  unique (user_id, module_id)
);

create table public.feedback (
  id            uuid primary key default gen_random_uuid(),
  reflection_id uuid references public.reflections(id) on delete cascade,
  to_user       uuid not null references public.profiles(id) on delete cascade,
  from_user     uuid not null references public.profiles(id) on delete cascade,
  body          text not null,
  kind          text not null default 'comment' check (kind in ('comment','revise','note')),
  created_at    timestamptz not null default now(),
  read_at       timestamptz
);

-- ---------- supervision (kept separate from coursework) ----------
create table public.supervision_meetings (
  id            uuid primary key default gen_random_uuid(),
  supervisor_id uuid not null references public.profiles(id),
  type          public.meeting_type not null,
  starts_at     timestamptz not null,
  minutes       int not null check (minutes between 15 and 480),
  status        public.meeting_status not null default 'scheduled',
  agenda        text,
  notes         text,                    -- de-identified only
  approved_at   timestamptz,
  approved_by   uuid references public.profiles(id),
  created_at    timestamptz not null default now(),
  constraint approve_only_completed check (approved_at is null or status = 'completed')
);
create table public.meeting_attendees (
  meeting_id    uuid not null references public.supervision_meetings(id) on delete cascade,
  supervisee_id uuid not null references public.profiles(id) on delete cascade,
  primary key (meeting_id, supervisee_id)
);
comment on table public.supervision_meetings is
  'Supervisor-entered records. Never derived from module completion. Not a board filing.';

-- ---------- audit ----------
create table public.activity_log (
  id         bigint generated always as identity primary key,
  actor_id   uuid references public.profiles(id) on delete set null,
  verb       text not null,
  subject_id uuid,
  detail     jsonb,
  created_at timestamptz not null default now()
);

-- ---------- commerce (phase 2; populated only by server webhooks) ----------
create table public.purchases (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references public.profiles(id),
  course_id          uuid references public.courses(id),
  plan               text not null,
  amount_cents       int not null,
  stripe_session_id  text unique,
  status             text not null default 'pending',
  created_at         timestamptz not null default now()
);

-- ---------- indexes ----------
create index on public.supervision_assignments (student_id);
create index on public.modules (course_id);
create index on public.lessons (module_id);
create index on public.quiz_questions (module_id);
create index on public.enrollments (course_id);
create index on public.quiz_attempts (user_id, module_id);
create index on public.reflections (module_id);
create index on public.feedback (to_user);
create index on public.meeting_attendees (supervisee_id);

-- =====================================================================
-- Helper functions (SECURITY DEFINER, fixed search_path)
-- =====================================================================
create or replace function public.my_role() returns public.app_role
language sql stable security definer set search_path = '' as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select role = 'admin' from public.profiles where id = auth.uid()), false)
$$;

create or replace function public.supervises(p_student uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.supervision_assignments
                 where supervisor_id = auth.uid() and student_id = p_student and active)
$$;

create or replace function public.teaches(p_course uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.course_instructors
                 where course_id = p_course and instructor_id = auth.uid())
$$;

create or replace function public.module_course(p_module uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select course_id from public.modules where id = p_module
$$;

create or replace function public.enrolled_in(p_course uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.enrollments e join public.courses c on c.id = e.course_id
                 where e.user_id = auth.uid() and e.course_id = p_course and c.status = 'published')
$$;

create or replace function public.attends(p_meeting uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.meeting_attendees where meeting_id = p_meeting and supervisee_id = auth.uid())
$$;

create or replace function public.runs_meeting(p_meeting uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.supervision_meetings where id = p_meeting and supervisor_id = auth.uid())
$$;

-- Grade server-side so the answer key never reaches the browser.
create or replace function public.submit_quiz_attempt(p_module uuid, p_answers int[])
returns public.quiz_attempts
language plpgsql security definer set search_path = '' as $$
declare v_total int; v_right int; v_pass int; v_row public.quiz_attempts;
begin
  if not public.enrolled_in(public.module_course(p_module)) then
    raise exception 'not enrolled';
  end if;
  select count(*), count(*) filter (where q.correct_index = p_answers[q.position])
    into v_total, v_right
    from public.quiz_questions q where q.module_id = p_module;
  if v_total = 0 then raise exception 'no questions'; end if;
  select c.pass_score into v_pass from public.courses c where c.id = public.module_course(p_module);
  insert into public.quiz_attempts (user_id, module_id, answers, score, passed)
  values (auth.uid(), p_module, p_answers, round(v_right * 100.0 / v_total), round(v_right * 100.0 / v_total) >= v_pass)
  returning * into v_row;
  return v_row;
end $$;

-- Students see questions without the answer key.
create or replace view public.quiz_questions_student
with (security_invoker = false) as
  select id, module_id, position, prompt, options
  from public.quiz_questions q
  where public.enrolled_in(public.module_course(q.module_id))
     or public.teaches(public.module_course(q.module_id)) or public.is_admin();

-- Explanations are returned only after an attempt exists.
create or replace function public.quiz_review(p_module uuid)
returns table(question_id uuid, question_position int, correct_index int, explanation text)
language sql stable security definer set search_path = '' as $$
  select q.id, q.position, q.correct_index, q.explanation from public.quiz_questions q
  where q.module_id = p_module
    and exists (select 1 from public.quiz_attempts a where a.module_id = p_module and a.user_id = auth.uid())
$$;

-- Prevent students from changing their own role.
create or replace function public.guard_profile_role() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.role is distinct from old.role and auth.uid() is not null and not public.is_admin() then
    raise exception 'only admins can change roles';
  end if;
  return new;
end $$;
create trigger profiles_role_guard before update on public.profiles
  for each row execute function public.guard_profile_role();

-- New auth users get a student profile.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name) values (new.id, coalesce(new.raw_user_meta_data->>'full_name', 'New user'));
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- =====================================================================
-- Row-level security
-- =====================================================================
alter table public.profiles               enable row level security;
alter table public.supervision_assignments enable row level security;
alter table public.courses                enable row level security;
alter table public.course_instructors     enable row level security;
alter table public.modules                enable row level security;
alter table public.lessons                enable row level security;
alter table public.quiz_questions         enable row level security;
alter table public.enrollments            enable row level security;
alter table public.module_progress        enable row level security;
alter table public.quiz_attempts          enable row level security;
alter table public.reflections            enable row level security;
alter table public.feedback               enable row level security;
alter table public.supervision_meetings   enable row level security;
alter table public.meeting_attendees      enable row level security;
alter table public.activity_log           enable row level security;
alter table public.purchases              enable row level security;

-- profiles
create policy "profiles: self, supervisor, admin read" on public.profiles for select to authenticated
  using (id = auth.uid() or public.supervises(id) or public.is_admin()
         or exists (select 1 from public.supervision_assignments sa where sa.student_id = auth.uid() and sa.supervisor_id = profiles.id));
create policy "profiles: self update" on public.profiles for update to authenticated
  using (id = auth.uid() or public.is_admin()) with check (id = auth.uid() or public.is_admin());

-- supervision assignments
create policy "assign: parties read" on public.supervision_assignments for select to authenticated
  using (supervisor_id = auth.uid() or student_id = auth.uid() or public.is_admin());
create policy "assign: admin write" on public.supervision_assignments for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- courses
create policy "courses: read" on public.courses for select to authenticated
  using (public.is_admin() or public.teaches(id) or public.enrolled_in(id));
create policy "courses: anon catalog" on public.courses for select to anon
  using (status = 'published');
create policy "courses: instructors update" on public.courses for update to authenticated
  using (public.teaches(id) or public.is_admin()) with check (public.teaches(id) or public.is_admin());
create policy "courses: instructors create" on public.courses for insert to authenticated
  with check (public.my_role() in ('instructor','admin') and approval = 'not_approved');
create policy "courses: admin delete" on public.courses for delete to authenticated using (public.is_admin());

-- only admins may move a course out of 'not_approved'
create or replace function public.guard_course_approval() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.approval is distinct from old.approval and auth.uid() is not null and not public.is_admin() then
    raise exception 'only admins can change approval status';
  end if;
  new.updated_at := now();
  return new;
end $$;
create trigger courses_approval_guard before update on public.courses
  for each row execute function public.guard_course_approval();

create policy "course_instructors: read" on public.course_instructors for select to authenticated
  using (instructor_id = auth.uid() or public.is_admin() or public.enrolled_in(course_id));
create policy "course_instructors: admin write" on public.course_instructors for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- modules & lessons
create policy "modules: read" on public.modules for select to authenticated
  using (public.is_admin() or public.teaches(course_id) or public.enrolled_in(course_id));
create policy "modules: staff write" on public.modules for all to authenticated
  using (public.is_admin() or public.teaches(course_id)) with check (public.is_admin() or public.teaches(course_id));
create policy "lessons: read" on public.lessons for select to authenticated
  using (public.is_admin() or public.teaches(public.module_course(module_id)) or public.enrolled_in(public.module_course(module_id)));
create policy "lessons: staff write" on public.lessons for all to authenticated
  using (public.is_admin() or public.teaches(public.module_course(module_id)))
  with check (public.is_admin() or public.teaches(public.module_course(module_id)));

-- quiz questions: staff only (students use the view + RPCs)
create policy "questions: staff" on public.quiz_questions for all to authenticated
  using (public.is_admin() or public.teaches(public.module_course(module_id)))
  with check (public.is_admin() or public.teaches(public.module_course(module_id)));

-- enrollments
create policy "enroll: read" on public.enrollments for select to authenticated
  using (user_id = auth.uid() or public.supervises(user_id) or public.is_admin());
create policy "enroll: supervisor/admin assign" on public.enrollments for insert to authenticated
  with check ((public.supervises(user_id) and source = 'assigned') or public.is_admin());
create policy "enroll: supervisor/admin update" on public.enrollments for update to authenticated
  using (public.supervises(user_id) or public.is_admin()) with check (public.supervises(user_id) or public.is_admin());
create policy "enroll: supervisor/admin delete" on public.enrollments for delete to authenticated
  using (public.supervises(user_id) or public.is_admin());

-- progress: owner writes, supervisor/admin read
create policy "progress: read" on public.module_progress for select to authenticated
  using (user_id = auth.uid() or public.supervises(user_id) or public.is_admin());
create policy "progress: owner insert" on public.module_progress for insert to authenticated
  with check (user_id = auth.uid() and public.enrolled_in(public.module_course(module_id)));
create policy "progress: owner update" on public.module_progress for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- quiz attempts: inserted only by submit_quiz_attempt(); supervisors mark reviewed
create policy "attempts: read" on public.quiz_attempts for select to authenticated
  using (user_id = auth.uid() or public.supervises(user_id) or public.is_admin());
create policy "attempts: supervisor review" on public.quiz_attempts for update to authenticated
  using (public.supervises(user_id) or public.is_admin()) with check (public.supervises(user_id) or public.is_admin());

-- reflections
create policy "refl: read" on public.reflections for select to authenticated
  using (user_id = auth.uid() or public.supervises(user_id) or public.is_admin());
create policy "refl: owner insert" on public.reflections for insert to authenticated
  with check (user_id = auth.uid() and status = 'awaiting' and public.enrolled_in(public.module_course(module_id)));
create policy "refl: owner resubmit or supervisor status" on public.reflections for update to authenticated
  using (user_id = auth.uid() or public.supervises(user_id) or public.is_admin())
  with check (user_id = auth.uid() or public.supervises(user_id) or public.is_admin());

-- Students may edit/resubmit their reflection but can only set status back to 'awaiting'.
create or replace function public.guard_reflection() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() = old.user_id and not public.is_admin() then
    if new.status <> 'awaiting' then raise exception 'students cannot set review status'; end if;
    new.submitted_at := now();
  elsif auth.uid() is not null and new.body is distinct from old.body then
    raise exception 'reviewers cannot edit a student''s reflection text';
  end if;
  return new;
end $$;
create trigger reflections_guard before update on public.reflections
  for each row execute function public.guard_reflection();

-- feedback
create policy "feedback: parties read" on public.feedback for select to authenticated
  using (to_user = auth.uid() or from_user = auth.uid() or public.supervises(to_user) or public.is_admin());
create policy "feedback: send" on public.feedback for insert to authenticated
  with check (from_user = auth.uid() and (public.supervises(to_user) or public.is_admin()
              or exists (select 1 from public.supervision_assignments sa where sa.student_id = auth.uid() and sa.supervisor_id = to_user and sa.active)));
create policy "feedback: recipient marks read" on public.feedback for update to authenticated
  using (to_user = auth.uid()) with check (to_user = auth.uid());

-- supervision meetings
create policy "meetings: read" on public.supervision_meetings for select to authenticated
  using (supervisor_id = auth.uid() or public.is_admin()
         or public.attends(id));
create policy "meetings: supervisor write" on public.supervision_meetings for all to authenticated
  using (supervisor_id = auth.uid() or public.is_admin())
  with check ((supervisor_id = auth.uid() and public.my_role() = 'instructor') or public.is_admin());
create policy "attendees: read" on public.meeting_attendees for select to authenticated
  using (supervisee_id = auth.uid() or public.is_admin() or public.runs_meeting(meeting_id));
create policy "attendees: supervisor write" on public.meeting_attendees for all to authenticated
  using (public.is_admin() or public.runs_meeting(meeting_id))
  with check (public.is_admin() or (public.supervises(supervisee_id) and public.runs_meeting(meeting_id)));

-- activity log: append-only for self; read by admin and supervisors of actor
create policy "activity: read" on public.activity_log for select to authenticated
  using (actor_id = auth.uid() or public.supervises(actor_id) or public.is_admin());
create policy "activity: append self" on public.activity_log for insert to authenticated
  with check (actor_id = auth.uid());

-- purchases: read own; writes only via service role (Stripe webhook edge function)
create policy "purchases: read own" on public.purchases for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- lock down default privileges on helper functions
revoke execute on function public.submit_quiz_attempt(uuid,int[]) from anon;
revoke execute on function public.quiz_review(uuid) from anon;
grant select on public.quiz_questions_student to authenticated;
revoke all on public.quiz_questions_student from anon;

-- Storage (create in dashboard or via SQL after review):
--   private bucket 'course-media'; read allowed when lessons.storage_path matches
--   and lessons policy passes; write allowed for course instructors/admins.
