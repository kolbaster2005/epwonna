-- =====================================================================
-- AI-проверка сочинений (Gemini) — новая колонка + таблица.
-- =====================================================================

-- Источник (пост в блоге / цитата / текст к графику) хранился только
-- как картинка. Добавляем текстовое поле, чтобы Edge Function
-- check-essay могла передать реальный текст стимула модели, а не
-- только служебное описание задания.
alter table public.questions add column if not exists stimulus_text text;

-- Результаты AI-проверки. Отдельная таблица, не колонка на
-- essay_submissions — чтобы хранить историю проверок (переписал
-- сочинение, проверил снова), не теряя предыдущие попытки.
create table if not exists public.essay_ai_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  question_id text not null references public.questions (id) on delete cascade,
  -- Снимок текста, который был отправлен на проверку — если
  -- пользователь потом отредактирует сочинение, старая проверка
  -- остаётся привязана к тому тексту, который реально проверялся.
  submitted_text text not null,
  -- Итоговая структура ответа модели: { overall: {band, comment},
  -- criteria: [{ name, band, comment }], model }. Не фиксируем это
  -- жёсткими колонками, чтобы менять состав критериев без миграций.
  feedback jsonb not null,
  model text not null default 'gemini-1.5-flash',
  created_at timestamptz not null default now()
);

alter table public.essay_ai_reviews enable row level security;

drop policy if exists "essay_ai_reviews: own" on public.essay_ai_reviews;
create policy "essay_ai_reviews: own" on public.essay_ai_reviews
  for select using (auth.uid() = user_id);

-- Вставляет и читает только сама Edge Function (через сервисный ключ,
-- в обход RLS) — с фронтенда напрямую в эту таблицу никто не пишет,
-- поэтому INSERT-политики для обычных пользователей нет намеренно.

create index if not exists essay_ai_reviews_question_user_idx
  on public.essay_ai_reviews (question_id, user_id, created_at desc);
