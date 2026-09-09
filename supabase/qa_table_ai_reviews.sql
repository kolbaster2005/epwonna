-- =====================================================================
-- AI-проверка грамматических заданий типа qa_table (Umformung /
-- Satzfortsetzungen) в EPD. Отдельная таблица от essay_ai_reviews —
-- это принципиально другой тип задания (много коротких строк в одном
-- задании вместо одного длинного текста), с собственным дневным
-- лимитом (3 в день — отдельно от лимита сочинений, 2 в день).
--
-- В отличие от сочинений, ответы на qa_table нигде не сохраняются
-- по мере ввода (только в answersSnapshot при отправке всего
-- пробника) — поэтому submitted_answers пишется прямо из того, что
-- пришло в теле запроса на проверку, а не читается из отдельной
-- таблицы черновиков.
-- =====================================================================

create table if not exists public.qa_table_ai_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  question_id text not null references public.questions (id) on delete cascade,
  -- Задание может быть привязано к нескольким пробникам через
  -- test_tasks (переиспользование банка) — без test_id проверка
  -- одного пробника перетекала бы в другой (тот же урок, что и с
  -- essay_ai_reviews).
  test_id text references public.tests (id) on delete cascade,
  -- { r1: "текст ответа", r2: "...", ... } — то, что реально было
  -- отправлено на проверку.
  submitted_answers jsonb not null,
  -- { rows: [{ id, score, maxScore, comment }], totalScore, totalMax, overallComment }
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
