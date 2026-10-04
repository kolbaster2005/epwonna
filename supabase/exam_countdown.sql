-- =====================================================================
-- Виджет «До экзаменов» на pro-главной (ProDashboard.jsx). Дату
-- ближайшего экзамена и статус регистрации задаёт админ на странице
-- /admin/exam-countdown; сколько дней осталось, фронтенд считает сам
-- от сегодняшней даты — так что число уменьшается каждый день без
-- каких-либо правок.
--
-- Таблица всегда из одной строки (id = 1). Читать может кто угодно
-- (виджет видят все pro-пользователи), писать — только админ.
-- Безопасно выполнять повторно.
-- =====================================================================

create table if not exists public.exam_countdown (
  id smallint primary key default 1 check (id = 1),
  exam_date date,
  registration_open boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.exam_countdown enable row level security;

drop policy if exists "exam_countdown: public read" on public.exam_countdown;
create policy "exam_countdown: public read" on public.exam_countdown
  for select using (true);

drop policy if exists "exam_countdown: admin write" on public.exam_countdown;
create policy "exam_countdown: admin write" on public.exam_countdown
  for all using (public.is_admin()) with check (public.is_admin());

insert into public.exam_countdown (id) values (1) on conflict (id) do nothing;
