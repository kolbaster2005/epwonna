-- =====================================================================
-- Исправление: одно и то же письменное задание (essay_choice) может
-- быть привязано к нескольким разным пробникам через test_tasks (это
-- нормально для остальных типов заданий — банк переиспользуется). Но
-- для сочинений это означало, что ответ и AI-проверка были привязаны
-- только к question_id, без привязки к конкретному пробнику — решив
-- задание в одном пробнике, человек видел тот же текст и ту же
-- проверку ИИ в любом другом пробнике с тем же заданием, даже до того
-- как сам что-то писал. Теперь сочинение и его проверка привязаны к
-- паре (задание, пробник), а не только к заданию.
-- =====================================================================

-- essay_submissions: уникальность теперь по (пользователь, задание,
-- пробник) — можно решать одно и то же задание отдельно в разных
-- пробниках, не перезаписывая прошлый ответ.
alter table public.essay_submissions drop constraint if exists essay_submissions_user_id_question_id_key;
alter table public.essay_submissions add constraint essay_submissions_user_question_test_key
  unique (user_id, question_id, test_id);

-- essay_ai_reviews: добавляем test_id, чтобы проверка тоже была
-- привязана к конкретному пробнику, а не только к заданию.
alter table public.essay_ai_reviews add column if not exists test_id text references public.tests (id) on delete cascade;

create index if not exists essay_ai_reviews_question_user_test_idx
  on public.essay_ai_reviews (question_id, user_id, test_id, created_at desc);
