-- =====================================================================
-- EP WONNA — Supabase schema
--
-- Run this ONCE in your Supabase project's SQL Editor (Dashboard →
-- SQL Editor → New query → paste → Run). Safe to re-run: everything
-- uses `create table if not exists` / `create or replace`.
--
-- What this creates:
--   profiles     one row per signed-up user (role: 'user' | 'admin')
--   tests   one row per пробник (replaces seedTests.js)
--   questions    one row per question, FK → tests
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. profiles — extends auth.users with app-specific fields (role).
--    Supabase Auth already manages auth.users; we never touch that
--    table directly. A trigger below keeps profiles in sync with it.
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  role text not null default 'user' check (role in ('user', 'admin')),
  -- One of avatarOptions' ids in src/data/avatars.js, or null for "no
  -- avatar" (falls back to the first-letter-of-email circle). The actual
  -- images are static files bundled with the frontend, NOT stored here —
  -- this column is just a small reference, same reasoning as pdf_url on
  -- `tests` pointing at Storage instead of holding file bytes.
  avatar_key text,
  created_at timestamptz not null default now()
);

-- Safe to re-run on a project that already has the table from before
-- avatar_key existed.
alter table public.profiles add column if not exists avatar_key text;

alter table public.profiles enable row level security;

drop policy if exists "profiles: read own" on public.profiles;
create policy "profiles: read own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles: update own" on public.profiles;
create policy "profiles: update own" on public.profiles
  for update using (auth.uid() = id);

-- The policy above only restricts WHICH ROW a person can update (their
-- own) — it says nothing about which COLUMNS. Now that the app has a
-- legitimate reason to call `update profiles ...` from the client
-- (picking an avatar), a person could otherwise also sneak `role:
-- 'admin'` into that same request. This trigger silently keeps `role`
-- unchanged whenever the update comes from a normal client connection
-- (the `authenticated`/`anon` Postgres roles PostgREST uses) — it only
-- lets `role` change when run as `postgres`, i.e. you, by hand, in the
-- SQL Editor (see the "Сделать себя админом" step in the README).
create or replace function public.prevent_self_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if current_user <> 'postgres' and new.role is distinct from old.role then
    new.role := old.role;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_prevent_role_change on public.profiles;
create trigger profiles_prevent_role_change
  before update on public.profiles
  for each row execute procedure public.prevent_self_role_change();

-- Auto-create a profile row whenever someone signs up through
-- Supabase Auth, so `profiles` never gets out of sync with `auth.users`.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Helper used by the write policies below — kept as a function (rather
-- than repeating the subquery in every policy) so it's one place to
-- change if the admin check ever gets more complex.
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ---------------------------------------------------------------------
-- 2. tests — one row per пробник. Column names are the snake_case
--    counterparts of the camelCase fields the app already uses (see the
--    mapping table in src/services/testsService.js) — title/
--    shortDescription/fullDescription/isOfficial/durationMinutes/
--    pdfUrl/pdfFileName/oralTask.
-- ---------------------------------------------------------------------
create table if not exists public.tests (
  id text primary key,
  exam_key text not null check (exam_key in ('epm', 'epd', 'epe')),
  title text not null default '',
  short_description text not null default '',
  full_description text not null default '',
  is_official boolean not null default true,
  -- A "model" isn't a practice test with real official-format content —
  -- it's a demonstration of what the exam looks like (e.g. the oral
  -- exam's monologue task showing all 4 possible prompt types at once,
  -- instead of the real exam's 2). Shown with its own badge on the exam
  -- page instead of "Официальный/Неофициальный".
  is_model boolean not null default false,
  -- Pinned tests always sort first on the exam page and in the admin
  -- list, regardless of year/id — for whichever probnik should stay at
  -- the top (e.g. the newest official one, or the one you want people
  -- to try first).
  is_pinned boolean not null default false,
  topic text,
  format text check (format in ('written', 'oral')),
  year int,
  duration_minutes int not null default 60,
  pdf_url text,
  pdf_file_name text,
  -- Only set for oral-phase tests — see OralTestPage.jsx. Holds the
  -- {stages: [...]} structure as-is; no separate table for it yet.
  oral_task jsonb,
  -- Shared reading/listening passages for this test: [{ id, title, text }].
  -- A passage is NOT embedded inside any one question — several separate
  -- questions can reference the same passage via questions.passage_id
  -- (see below), and TestPage shows it in its own persistent panel while
  -- the person answers whichever questions point at it. This is exactly
  -- how a real Leseverstehen text with 3 separate Aufgaben works: one
  -- text, three independently-numbered questions.
  passages jsonb,
  created_at timestamptz not null default now()
);

-- Safe to re-run on a project whose `tests` table predates passages.
alter table public.tests add column if not exists passages jsonb;
alter table public.tests add column if not exists is_model boolean not null default false;
alter table public.tests add column if not exists is_pinned boolean not null default false;

create index if not exists tests_exam_key_idx on public.tests (exam_key);

alter table public.tests enable row level security;

drop policy if exists "tests: public read" on public.tests;
create policy "tests: public read" on public.tests
  for select using (true);

drop policy if exists "tests: admin write" on public.tests;
create policy "tests: admin write" on public.tests
  for all using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------
-- 3. questions — one row per question, FK → tests. `type` decides
--    which of the polymorphic columns below are meaningful — see
--    src/utils/grading.js for the exact per-type rules:
--      multiple_choice  → options, correct_option_ids
--      numeric          → correct_value, tolerance, unit
--      true_false       → statements
--      heading_match    → correct_sequence
--      short_answer     → accepted_answers — a short fill-in-the-blank
--                         word/phrase, checked case/whitespace-
--                         insensitively against any of these strings
--      cloze            → cloze — { template, blanks: { [id]: {
--                         acceptedAnswers } } }. template is a paragraph
--                         with {1}, {2}, ... markers inline (Lückentext);
--                         the frontend renders a small input right where
--                         each marker was instead of pulling the blanks
--                         out into a separate list — see parseCloze() in
--                         src/utils/grading.js.
--      free_text        → (none — never auto-graded)
--      multi_part       → parts — a shared question stem with several
--                         independently-graded parts (e.g. "a) fill in
--                         a table, b) i.–iv. compute these
--                         probabilities"). Each entry in `parts` is
--                         itself either numeric-shaped (correctValue/
--                         tolerance/unit), `short_answer`-shaped
--                         (acceptedAnswers), a `table` (a grid of given
--                         vs. student-filled cells), or `free_text` —
--                         see the worked examples in seed.sql and the
--                         comment atop src/utils/grading.js.
--    jsonb is used for the array/object-shaped fields instead of a
--    separate table per type, since the shapes are small and already
--    match what the frontend sends/expects 1:1.
-- ---------------------------------------------------------------------
create table if not exists public.questions (
  id text primary key,
  test_id text not null references public.tests (id) on delete cascade,
  position int not null default 0,
  category text,
  type text not null default 'multiple_choice'
    constraint questions_type_check
    check (type in ('multiple_choice', 'numeric', 'true_false', 'heading_match', 'short_answer', 'cloze', 'qa_table', 'tf_table', 'free_text', 'multi_part')),
  text text not null default '',
  image text,
  explanation text,
  -- References an id inside this question's test's own `passages` array
  -- (public.tests.passages) — not a foreign key, since passages live in
  -- jsonb, not their own table. Null = this question has no shared
  -- reading/listening passage attached.
  passage_id text,
  options jsonb,              -- [{ id, text }]
  correct_option_ids jsonb,   -- [id, ...]
  correct_value numeric,
  tolerance numeric,
  unit text,
  statements jsonb,           -- [{ id, text, correct }]
  correct_sequence text,
  accepted_answers jsonb,     -- [text, ...] — short_answer only
  cloze jsonb,                 -- { template, blanks } — cloze only
  qa_table jsonb,              -- { rows: [{ id, prompt, given? | acceptedAnswers? }] } — qa_table only
  tf_table jsonb,               -- { rows: [{ id, statement, correct, words: [4], isExample? }] } — tf_table only
  essay_choice jsonb,           -- { options: [{ id, title, image?, text?, instructions: [...] }] } — essay_choice only
  parts jsonb,                -- [{ id, label, type, ... }] — multi_part only
  -- For whole-question types that can't be auto-graded (free_text,
  -- essay_choice, or a qa_table that's entirely freeText rows): if set,
  -- self-grading becomes "how many of N points did you earn?" instead
  -- of a plain correct/incorrect toggle — see getVerdictWithSelfGrade
  -- in grading.js. Null = binary self-grade (the old behavior).
  self_grade_max_points integer,
  created_at timestamptz not null default now()
);

alter table public.questions add column if not exists self_grade_max_points integer;

-- Safe to re-run on a project whose `questions` table predates
-- multi_part / parts / short_answer / passage_id / cloze / qa_table / tf_table.
alter table public.questions add column if not exists parts jsonb;
alter table public.questions add column if not exists accepted_answers jsonb;
alter table public.questions add column if not exists passage_id text;
alter table public.questions add column if not exists cloze jsonb;
alter table public.questions add column if not exists qa_table jsonb;
alter table public.questions add column if not exists tf_table jsonb;
alter table public.questions add column if not exists essay_choice jsonb;
alter table public.questions drop constraint if exists questions_type_check;
alter table public.questions add constraint questions_type_check
  check (type in ('multiple_choice', 'numeric', 'true_false', 'heading_match', 'short_answer', 'cloze', 'qa_table', 'tf_table', 'essay_choice', 'free_text', 'multi_part'));

create index if not exists questions_test_id_idx on public.questions (test_id);

alter table public.questions enable row level security;

drop policy if exists "questions: public read" on public.questions;
create policy "questions: public read" on public.questions
  for select using (true);

drop policy if exists "questions: admin write" on public.questions;
create policy "questions: admin write" on public.questions
  for all using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------
-- 4. essay_submissions — written answers to `essay_choice` questions
--    (Schreibaufgabe-style: pick one of two prompts, write a free-form
--    text). Never auto-graded — this table exists purely so a person
--    can come back later (МОЁ ОБУЧЕНИЕ → «Мои сочинения») and re-read
--    what they wrote. One row per (user, question); resubmitting the
--    same question just overwrites it rather than piling up history.
-- ---------------------------------------------------------------------
create table if not exists public.essay_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  test_id text not null references public.tests (id) on delete cascade,
  question_id text not null references public.questions (id) on delete cascade,
  exam_key text not null check (exam_key in ('epm', 'epd', 'epe')),
  -- Which of question.essay_choice.options[] they picked, and its title
  -- denormalized in (e.g. "Schreibaufgabe 1") so the list view in
  -- МОЁ ОБУЧЕНИЕ doesn't need to re-fetch/parse the question just to
  -- show a heading.
  choice_id text not null,
  choice_title text,
  text text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, question_id)
);

alter table public.essay_submissions enable row level security;

drop policy if exists "essay_submissions: own" on public.essay_submissions;
create policy "essay_submissions: own" on public.essay_submissions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists essay_submissions_user_id_idx on public.essay_submissions (user_id);

-- ---------------------------------------------------------------------
-- 5. dictionary_words — the person's personal vocabulary list. Words get
--    added either from the "Добавить слово" button on the Словарь page,
--    or from the select-text popup available anywhere in the app (see
--    src/components/SelectionPopup.jsx). Free-form `category` (not an
--    enum) — the person types whatever grouping makes sense to them
--    ("Экономика", etc.); words with no category show under
--    "Без категории" on the Словарь page.
-- ---------------------------------------------------------------------
create table if not exists public.dictionary_words (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  word text not null,
  translation text not null default '',
  example text,
  category text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.dictionary_words enable row level security;

drop policy if exists "dictionary_words: own" on public.dictionary_words;
create policy "dictionary_words: own" on public.dictionary_words
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists dictionary_words_user_id_idx on public.dictionary_words (user_id);

-- ---------------------------------------------------------------------
-- 6. test_attempts — one row per completed written probnik (see
--    TestPage.jsx's handleFinish). Full history is kept — doing the same
--    test again just adds another row, so "Последние пробники" and the
--    trend chart on МОЁ ОБУЧЕНИЕ → «Мой прогресс» have something to show.
--    score_percent is null when the test has no auto-graded questions
--    at all (shouldn't normally happen for a written test, but the
--    column allows for it rather than lying with a 0%). Oral tests
--    aren't tracked here yet — OralTestPage.jsx has no per-question
--    verdicts to compute a score from.
-- ---------------------------------------------------------------------
create table if not exists public.test_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  test_id text not null references public.tests (id) on delete cascade,
  exam_key text not null check (exam_key in ('epm', 'epd', 'epe')),
  test_title text not null,
  score_percent integer,
  correct_count integer not null default 0,
  partial_count integer not null default 0,
  incorrect_count integer not null default 0,
  ungraded_count integer not null default 0,
  total_questions integer not null default 0,
  duration_seconds integer not null default 0,
  -- { answers: {...}, selfGrades: {...} } — same shapes TestPage.jsx
  -- already keeps in memory, snapshotted at submission time so a past
  -- attempt can be reviewed later (which answers were given, which were
  -- right/wrong) without needing the test's questions to stay unchanged
  -- forever. Nullable — attempts saved before this column existed just
  -- won't have a reviewable snapshot.
  answers_snapshot jsonb,
  completed_at timestamptz not null default now()
);

alter table public.test_attempts add column if not exists answers_snapshot jsonb;

alter table public.test_attempts enable row level security;

drop policy if exists "test_attempts: own" on public.test_attempts;
create policy "test_attempts: own" on public.test_attempts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists test_attempts_user_id_idx on public.test_attempts (user_id);

-- ---------------------------------------------------------------------
-- 7. topics — was hardcoded per-exam in src/data/examData.js (see the
--    "Stand-in for the `topics` table" comment there); now a real,
--    admin-editable table. `id` is a short slug used as the value
--    stored on tests.topic (e.g. 'algebra') — sort_order controls the
--    order topics appear in the dropdown, lowest first.
-- ---------------------------------------------------------------------
create table if not exists public.topics (
  id text not null,
  exam_key text not null check (exam_key in ('epm', 'epd', 'epe')),
  label text not null,
  sort_order integer not null default 0,
  primary key (exam_key, id)
);

alter table public.topics enable row level security;

drop policy if exists "topics: public read" on public.topics;
create policy "topics: public read" on public.topics
  for select using (true);

drop policy if exists "topics: admin write" on public.topics;
create policy "topics: admin write" on public.topics
  for all using (public.is_admin()) with check (public.is_admin());

-- Seed with the same topics that used to be hardcoded, so existing
-- tests (whose `topic` column already stores one of these ids) keep
-- working without needing any data migration.
insert into public.topics (id, exam_key, label, sort_order) values
  ('algebra', 'epm', 'Алгебра', 1),
  ('geometry', 'epm', 'Геометрия', 2),
  ('functions', 'epm', 'Функции', 3),
  ('stats', 'epm', 'Статистика и векторы', 4),
  ('nutrition', 'epd', 'Питание', 1),
  ('environment', 'epd', 'Окружающий мир', 2),
  ('economy', 'epd', 'Экономика', 3),
  ('nutrition', 'epe', 'Питание', 1),
  ('environment', 'epe', 'Окружающий мир', 2),
  ('economy', 'epe', 'Экономика', 3)
on conflict (exam_key, id) do nothing;

-- ---------------------------------------------------------------------
-- 8. Make yourself an admin (run this AFTER you've signed up once
--    through the app, so a row already exists in profiles):
--
--   update public.profiles set role = 'admin' where email = 'you@example.com';
--
-- Everyone else stays 'user' by default — only admins can write to
-- tests/questions per the policies above; the /admin panel itself
-- doesn't check this yet (see README), so treat this as the DB-level
-- backstop until that route guard is added.
-- ---------------------------------------------------------------------
