-- =====================================================================
-- Возможность продолжить незавершённый пробник: черновик — это строка
-- test_attempts с completed_at is null, обновляемая по ходу прохождения
-- (см. TestPage.jsx + attemptsService.saveDraftAttempt/getDraftAttempt/
-- deleteDraftAttempt). Завершённая попытка — как и раньше, completed_at
-- проставлен и больше не меняется.
-- =====================================================================

alter table public.test_attempts
  alter column completed_at drop not null,
  alter column completed_at drop default;

alter table public.test_attempts
  add column if not exists updated_at timestamptz not null default now();

-- Быстрый поиск черновика по (пользователь, пробник) — TestPage.jsx
-- делает это при каждом открытии пробника.
create index if not exists test_attempts_in_progress_idx
  on public.test_attempts (user_id, test_id)
  where completed_at is null;
