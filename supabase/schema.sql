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
-- A test row that exists purely as a container for задания в банке — never
-- shown on the public exam page or counted in "N из M пробников пройдено"
-- stats. Interim solution: lets you add/edit standalone tasks using the
-- exact same (already built, already tested) test editor, without needing
-- the bigger test_id-becomes-optional + test_tasks join-table rework yet
-- (that's still a separate, deferred step — see the architecture doc).
alter table public.tests add column if not exists is_task_bank boolean not null default false;
-- A test row created by "Сгенерировать пробник" (see generationService.js).
-- Fully real and playable (getTest/test_attempts/task_attempts all work
-- normally, so the person's stats for it persist), but never shown in
-- the public probnik list or the admin's test list, and excluded from
-- the "N из M пробников пройдено" denominator — same treatment
-- is_task_bank already gets, for the same reason: it's not one of the
-- fixed curriculum probniks, so listing it there would just clutter the
-- list with a new row every time someone generates one.
alter table public.tests add column if not exists is_generated boolean not null default false;

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
  -- Plain-text version of whatever the image/quote/graph shows for
  -- essay_choice questions — the image itself carries the content for
  -- display, but nothing downstream (AI essay checking, screen readers,
  -- search) can read pixels. Nullable; only meaningful for essay_choice.
  stimulus_text text,
  parts jsonb,                -- [{ id, label, type, ... }] — multi_part only
  -- For whole-question types that can't be auto-graded (free_text,
  -- essay_choice, or a qa_table that's entirely freeText rows): if set,
  -- self-grading becomes "how many of N points did you earn?" instead
  -- of a plain correct/incorrect toggle — see getVerdictWithSelfGrade
  -- in grading.js. Null = binary self-grade (the old behavior).
  self_grade_max_points integer,
  -- Необязательная ссылка на исходник (обычно Google Drive) —
  -- показывается маленькой надписью «Скачать исходник» под вопросом,
  -- только авторизованным пользователям, открывается в новой вкладке.
  -- Не у каждого вопроса есть исходник, поэтому просто nullable.
  source_url text,
  -- Необязательный список подпунктов (["Geben Sie...", "Nehmen Sie
  -- Stellung...", ...]) — показывается ПОСЛЕ картинки вопроса как
  -- нумерованный список 1/2/3, для раскладки "короткая фраза -> картинка
  -- -> подпункты", когда всё в question.text (который всегда рендерится
  -- ДО картинки) не подходит.
  instructions jsonb,
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
alter table public.questions add column if not exists stimulus_text text;
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
  unique (user_id, question_id, test_id)
);

alter table public.essay_submissions enable row level security;

drop policy if exists "essay_submissions: own" on public.essay_submissions;
create policy "essay_submissions: own" on public.essay_submissions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists essay_submissions_user_id_idx on public.essay_submissions (user_id);

-- ---------------------------------------------------------------------
-- 4b. essay_ai_reviews — AI (Gemini) feedback on essay_submissions.
--     Separate table, not a column on essay_submissions, so re-checking
--     after an edit keeps prior reviews instead of overwriting them.
--     Only the Edge Function (check-essay, via the service-role key)
--     writes here — no INSERT policy for regular users on purpose.
-- ---------------------------------------------------------------------
create table if not exists public.essay_ai_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  question_id text not null references public.questions (id) on delete cascade,
  -- Задание может быть привязано к нескольким пробникам через
  -- test_tasks (переиспользование банка) — без test_id проверка одного
  -- и того же задания в разных пробниках была бы одной на всех.
  test_id text references public.tests (id) on delete cascade,
  submitted_text text not null,
  -- { overall: {band, comment}, criteria: [{ name, band, comment }], model }
  feedback jsonb not null,
  model text not null default 'gemini-1.5-flash',
  created_at timestamptz not null default now()
);

alter table public.essay_ai_reviews enable row level security;

drop policy if exists "essay_ai_reviews: own" on public.essay_ai_reviews;
create policy "essay_ai_reviews: own" on public.essay_ai_reviews
  for select using (auth.uid() = user_id);

create index if not exists essay_ai_reviews_question_user_test_idx
  on public.essay_ai_reviews (question_id, user_id, test_id, created_at desc);

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
-- Замена тем EPD на официальный список из 10 тем (только главные темы,
-- без подтем — как прислал пользователь). Старые 'nutrition'/
-- 'environment'/'economy' у EPD были временными заглушками ещё с самого
-- начала проекта, никогда не были настоящим официальным списком.
-- Безопасно выполнять повторно.
-- ---------------------------------------------------------------------
delete from public.topics where exam_key = 'epd' and id in ('nutrition', 'environment', 'economy');

insert into public.topics (id, exam_key, label, sort_order) values
  ('work-economy', 'epd', 'Arbeitswelt und Wirtschaft', 1),
  ('relationships-equality', 'epd', 'Beziehungen und Geschlechtergerechtigkeit', 2),
  ('society-engagement', 'epd', 'Gesellschaft und soziales Engagement', 3),
  ('consumerism', 'epd', 'Konsumgesellschaft', 4),
  ('health', 'epd', 'Körperliche und mentale Gesundheit', 5),
  ('education', 'epd', 'Lernen, Bildung, Studium, Wissenschaft', 6),
  ('media', 'epd', 'Medien', 7),
  ('tourism-travel', 'epd', 'Tourismus und Reisen', 8),
  ('housing', 'epd', 'Wohnen', 9),
  ('environment', 'epd', 'Umwelt', 10)
on conflict (exam_key, id) do nothing;

-- epd-thema-arbeitswelt-1 указывал на удалённую тему 'economy' — это и
-- есть Arbeitswelt und Wirtschaft по смыслу (видно по названию самого
-- пробника), перенаправляем на новый id, а не оставляем висеть в никуда.
update public.tests set topic = 'work-economy' where id = 'epd-thema-arbeitswelt-1';

-- ---------------------------------------------------------------------
-- Замена тем EPE на официальный список из 10 тем — та же история, что
-- и у EPD: старые 'nutrition'/'environment'/'economy' были временными
-- заглушками с самого начала проекта. Безопасно выполнять повторно.
-- ---------------------------------------------------------------------
delete from public.topics where exam_key = 'epe' and id in ('nutrition', 'environment', 'economy');

insert into public.topics (id, exam_key, label, sort_order) values
  ('family-friends-relationships', 'epe', 'Family, Friends and Relationships', 1),
  ('hobbies-free-time-celebrations', 'epe', 'Hobbies, Free-time Activities and Celebrating Special Events', 2),
  ('health-nutrition', 'epe', 'Health and Nutrition', 3),
  ('homes-living-places', 'epe', 'Homes and Living; Countries, Cities, Hometowns', 4),
  ('shopping-consumerism-fashion', 'epe', 'Shopping, Consumerism, Clothes & Fashion', 5),
  ('world-of-work-jobs', 'epe', 'World of Work, Jobs', 6),
  ('education-university-language', 'epe', 'Education, University and Language Learning', 7),
  ('media-communication', 'epe', 'Media and Communication', 8),
  ('travel-tourism-transport', 'epe', 'Travel, Tourism, Means of Transport', 9),
  ('environmental-issues-change', 'epe', 'Environmental Issues and Change', 10)
on conflict (exam_key, id) do nothing;

-- ---------------------------------------------------------------------
-- 9. Банк заданий — Фаза 0 (см. архитектурный разбор). Чисто аддитивно:
--    новые таблицы + автоматический перенос данных ИЗ уже существующих
--    tests.passages / questions.category / tests.topic. Ничего
--    существующего не удаляется и не переписывается — passages/topic
--    остаются на месте как есть, EPM участвует в переносе наравне со
--    всеми (это перенос СТРУКТУРЫ, не переделка контента, поэтому
--    выделять EPM не нужно — с ним просто ничего интересного не
--    произойдёт, у него нет passages).
--
--    Безопасно выполнять повторно (везде if not exists / on conflict /
--    условия "ещё не перенесено") — можно гонять хоть каждый раз
--    вместе с остальным schema.sql.
-- ---------------------------------------------------------------------

-- ---- 9.1. content — переиспользуемые тексты, перенесённые из
--      tests.passages. Один текст теперь может быть использован любым
--      количеством заданий, а не только внутри одного пробника.
create table if not exists public.content (
  id uuid primary key default gen_random_uuid(),
  exam_key text not null check (exam_key in ('epm', 'epd', 'epe')),
  title text,
  body text not null,
  category text,
  -- Только для прослеживаемости — откуда этот текст изначально взялся.
  -- Не используется приложением, можно смело игнорировать в коде.
  legacy_test_id text,
  legacy_passage_id text,
  created_at timestamptz not null default now()
);

alter table public.content enable row level security;

drop policy if exists "content: public read" on public.content;
create policy "content: public read" on public.content
  for select using (true);

drop policy if exists "content: admin write" on public.content;
create policy "content: admin write" on public.content
  for all using (public.is_admin()) with check (public.is_admin());

-- Перенос: разворачиваем tests.passages (jsonb-массив) в отдельные
-- строки content. Условие "not exists" делает перенос идемпотентным —
-- повторный запуск не создаст дублей.
insert into public.content (exam_key, title, body, category, legacy_test_id, legacy_passage_id)
select
  t.exam_key,
  p ->> 'title',
  p ->> 'text',
  p ->> 'category',
  t.id,
  p ->> 'id'
from public.tests t,
     jsonb_array_elements(t.passages) as p
where t.passages is not null
  and jsonb_typeof(t.passages) = 'array'
  and not exists (
    select 1 from public.content c
    where c.legacy_test_id = t.id and c.legacy_passage_id = (p ->> 'id')
  );

-- Связываем questions с новым content — по той же паре (test_id,
-- passage_id), которой раньше вопрос указывал на текст ВНУТРИ jsonb
-- своего пробника. questions.passage_id и tests.passages остаются на
-- месте нетронутыми (ничего в приложении, что их сейчас читает, не
-- сломается) — content_id это просто дополнительная, более правильная
-- связь поверх.
alter table public.questions add column if not exists content_id uuid references public.content(id);
alter table public.questions add column if not exists source_url text;
alter table public.questions add column if not exists instructions jsonb;

update public.questions q
set content_id = c.id
from public.content c
where q.passage_id is not null
  and q.content_id is null
  and c.legacy_test_id = q.test_id
  and c.legacy_passage_id = q.passage_id;

-- ---- 9.2. exam_parts — часть экзамена (Leseverstehen, Grammatik,
--      Reading Comprehension...), той же формы, что и уже существующая
--      topics, только с меньшей нагрузкой на смысл (это структурная
--      характеристика, не содержательная — см. архитектурный разбор,
--      пункт 4). Заполняется из уже используемых значений
--      questions.category — то есть из того, чем вы и так пользуетесь
--      сейчас в виде свободного текста, просто теперь нормализовано.
create table if not exists public.exam_parts (
  id text not null,
  exam_key text not null check (exam_key in ('epm', 'epd', 'epe')),
  label text not null,
  sort_order integer not null default 0,
  primary key (exam_key, id)
);

alter table public.exam_parts enable row level security;

drop policy if exists "exam_parts: public read" on public.exam_parts;
create policy "exam_parts: public read" on public.exam_parts
  for select using (true);

drop policy if exists "exam_parts: admin write" on public.exam_parts;
create policy "exam_parts: admin write" on public.exam_parts
  for all using (public.is_admin()) with check (public.is_admin());

insert into public.exam_parts (id, exam_key, label, sort_order)
select distinct
  lower(regexp_replace(q.category, '[^a-zA-Zа-яёА-ЯЁ0-9]+', '-', 'g')) as id,
  t.exam_key,
  q.category as label,
  0
from public.questions q
join public.tests t on t.id = q.test_id
where q.category is not null and q.category <> ''
on conflict (exam_key, id) do nothing;

alter table public.questions add column if not exists exam_part_id text;

update public.questions q
set exam_part_id = lower(regexp_replace(q.category, '[^a-zA-Zа-яёА-ЯЁ0-9]+', '-', 'g'))
from public.tests t
where t.id = q.test_id
  and q.category is not null and q.category <> ''
  and q.exam_part_id is null;

-- ---- 9.3. task_topics — тема на уровне ЗАДАНИЯ, а не пробника
--      (главная проблема текущей модели, см. разбор, пункт 1).
--      Многие-ко-многим: одно задание может касаться нескольких тем.
--      Стартовое заполнение — копируем tests.topic каждого вопроса как
--      первое приближение (не идеально точно для каждого отдельного
--      задания, но разумная отправная точка — дальше можно уточнять
--      точечно через админку, ничего не сломав).
create table if not exists public.task_topics (
  task_id text not null references public.questions(id) on delete cascade,
  topic_id text not null,
  primary key (task_id, topic_id)
);

alter table public.task_topics enable row level security;

drop policy if exists "task_topics: public read" on public.task_topics;
create policy "task_topics: public read" on public.task_topics
  for select using (true);

drop policy if exists "task_topics: admin write" on public.task_topics;
create policy "task_topics: admin write" on public.task_topics
  for all using (public.is_admin()) with check (public.is_admin());

insert into public.task_topics (task_id, topic_id)
select q.id, t.topic
from public.questions q
join public.tests t on t.id = q.test_id
where t.topic is not null and t.topic <> ''
on conflict do nothing;

-- ---- 9.4. task_type — тип задания в терминах экзамена (Umformung,
--      Blog Comment, Überschriften zuordnen...) — НЕ то же самое, что
--      questions.type (это механика ответа: cloze/qa_table/...), см.
--      разбор, пункт 4. Осознанно nullable и не заполняется массово —
--      для этого поля нет надёжного источника в уже существующих
--      данных (свободный текст question.text не парсится надёжно
--      автоматически). Заполняется вручную по мере необходимости —
--      ничего не блокирует и не требует немедленных действий.
alter table public.questions add column if not exists task_type text;

-- ---------------------------------------------------------------------
-- 10. Банк заданий — Фаза 1: настоящее переиспользование одного и того
--    же задания в нескольких пробниках + прогресс на уровне отдельного
--    задания, а не только целого пробника.
--
--    questions.test_id остаётся как есть (its "родной" тест, где
--    задание изначально создано в админке — ничего не ломаем).
--    test_tasks — ДОПОЛНИТЕЛЬНЫЙ слой сверху: явный список "какие
--    задания в каком пробнике показываются, в каком порядке". Один и
--    тот же task_id может законно стоять в test_tasks для нескольких
--    разных test_id одновременно — это и даёт переиспользование.
--
--    Обратная совместимость: ниже все существующие вопросы разом
--    переносятся в test_tasks (test_id, position — 1 в 1 с тем, что уже
--    было), так что дальше код может опираться ТОЛЬКО на test_tasks, не
--    заботясь, "старое" это задание или новое.
-- ---------------------------------------------------------------------
create table if not exists public.test_tasks (
  test_id text not null references public.tests (id) on delete cascade,
  task_id text not null references public.questions (id) on delete cascade,
  position integer not null default 0,
  primary key (test_id, task_id)
);

alter table public.test_tasks enable row level security;

drop policy if exists "test_tasks: public read" on public.test_tasks;
create policy "test_tasks: public read" on public.test_tasks
  for select using (true);

drop policy if exists "test_tasks: admin write" on public.test_tasks;
create policy "test_tasks: admin write" on public.test_tasks
  for all using (public.is_admin()) with check (public.is_admin());

insert into public.test_tasks (test_id, task_id, position)
select test_id, id, position from public.questions
on conflict (test_id, task_id) do nothing;

-- Прогресс НА УРОВНЕ ЗАДАНИЯ — "решал ли пользователь конкретно эту
-- задачу и как", независимо от того, через какой пробник или будущую
-- сгенерированную подборку он до неё добрался. Одна строка на пару
-- (пользователь, задание) — хранит ПОСЛЕДНИЙ результат (upsert при
-- каждом новом решении), а не историю всех попыток — для фильтра
-- "уже решено / ещё нет" и прогресса по темам этого достаточно, полная
-- история — если понадобится позже, не блокирует ничего сейчас.
create table if not exists public.task_attempts (
  user_id uuid not null references auth.users (id) on delete cascade,
  task_id text not null references public.questions (id) on delete cascade,
  exam_key text not null check (exam_key in ('epm', 'epd', 'epe')),
  verdict text not null check (verdict in ('correct', 'partial', 'incorrect', 'ungraded')),
  answer jsonb,
  completed_at timestamptz not null default now(),
  primary key (user_id, task_id)
);

alter table public.task_attempts enable row level security;

drop policy if exists "task_attempts: own" on public.task_attempts;
create policy "task_attempts: own" on public.task_attempts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- 12. task_number — постоянный уникальный порядковый номер задания,
--    чисто для удобства администрирования (найти конкретный вопрос в
--    базе по номеру, который виден прямо на странице теста, вместо
--    того чтобы искать по id). Не связан с позицией внутри пробника —
--    задание получает его один раз и навсегда, независимо от того, в
--    скольких пробниках потом окажется.
--
--    Через sequence, а не вручную посчитанное значение — гарантирует
--    уникальность даже при одновременных вставках, без гонки условий.
-- ---------------------------------------------------------------------
create sequence if not exists public.task_number_seq;

alter table public.questions add column if not exists task_number integer;

-- Существующим вопросам, у которых номера ещё нет, назначаем его —
-- порядок по created_at, чтобы более старые задания получили меньшие
-- номера. Условие "is null" делает это безопасным для повторного
-- запуска — уже пронумерованные вопросы не трогаются.
update public.questions
set task_number = nextval('public.task_number_seq')
where task_number is null;

alter table public.questions alter column task_number set default nextval('public.task_number_seq');

drop index if exists questions_task_number_idx;
create unique index questions_task_number_idx on public.questions (task_number);

-- ---------------------------------------------------------------------
-- 13. question_reports — «Нашли ошибку?» под вопросом на странице
--    теста. task_number/email дублируются прямо в строку (не только
--    через FK) — чтобы обращение оставалось читаемым в админке, даже
--    если конкретное задание или профиль потом удалят.
-- ---------------------------------------------------------------------
create table if not exists public.question_reports (
  id uuid primary key default gen_random_uuid(),
  task_id text references public.questions (id) on delete set null,
  task_number integer,
  user_id uuid references auth.users (id) on delete set null,
  email text,
  message text not null,
  status text not null default 'new' check (status in ('new', 'resolved')),
  created_at timestamptz not null default now()
);

alter table public.question_reports enable row level security;

-- Отправить обращение может любой авторизованный — но читать чужие
-- обращения (и вообще список) может только админ.
drop policy if exists "question_reports: insert own" on public.question_reports;
create policy "question_reports: insert own" on public.question_reports
  for insert with check (auth.uid() = user_id);

drop policy if exists "question_reports: admin read" on public.question_reports;
create policy "question_reports: admin read" on public.question_reports
  for select using (public.is_admin());

drop policy if exists "question_reports: admin update" on public.question_reports;
create policy "question_reports: admin update" on public.question_reports
  for update using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------
-- 14. Make yourself an admin (run this AFTER you've signed up once
--    through the app, so a row already exists in profiles):
--
--   update public.profiles set role = 'admin' where email = 'you@example.com';
--
-- Everyone else stays 'user' by default — only admins can write to
-- tests/questions per the policies above; the /admin panel itself
-- doesn't check this yet (see README), so treat this as the DB-level
-- backstop until that route guard is added.
-- ---------------------------------------------------------------------

-- ---------------------------------------------------------------------
-- Собственная (не сторонняя) статистика посещений — см.
-- supabase/page_views.sql для подробных комментариев.
-- ---------------------------------------------------------------------
create table if not exists public.page_views (
  id bigint generated always as identity primary key,
  visitor_id text not null,
  user_id uuid references auth.users (id) on delete set null,
  path text not null,
  created_at timestamptz not null default now()
);

alter table public.page_views enable row level security;

drop policy if exists "page_views: anyone can insert" on public.page_views;
create policy "page_views: anyone can insert" on public.page_views
  for insert with check (true);

drop policy if exists "page_views: admin read" on public.page_views;
create policy "page_views: admin read" on public.page_views
  for select using (public.is_admin());

create index if not exists page_views_created_at_idx on public.page_views (created_at desc);
create index if not exists page_views_visitor_created_idx on public.page_views (visitor_id, created_at);

drop policy if exists "test_attempts: admin read" on public.test_attempts;
create policy "test_attempts: admin read" on public.test_attempts
  for select using (public.is_admin());

-- ---------------------------------------------------------------------
-- AI-проверка грамматических заданий qa_table (Umformung /
-- Satzfortsetzungen) — см. supabase/qa_table_ai_reviews.sql для
-- подробных комментариев.
-- ---------------------------------------------------------------------
create table if not exists public.qa_table_ai_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  question_id text not null references public.questions (id) on delete cascade,
  test_id text references public.tests (id) on delete cascade,
  submitted_answers jsonb not null,
  feedback jsonb not null,
  model text not null,
  created_at timestamptz not null default now()
);

alter table public.qa_table_ai_reviews enable row level security;

drop policy if exists "qa_table_ai_reviews: own" on public.qa_table_ai_reviews;
create policy "qa_table_ai_reviews: own" on public.qa_table_ai_reviews
  for select using (auth.uid() = user_id);

create index if not exists qa_table_ai_reviews_question_user_test_idx
  on public.qa_table_ai_reviews (question_id, user_id, test_id, created_at desc);
