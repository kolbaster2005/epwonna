-- =====================================================================
-- Собственная (не сторонняя) статистика посещений. Никаких внешних
-- сервисов — просто таблица в этой же базе. Записывается лёгким script
-- в src/lib/visits.js на каждый переход между страницами.
--
-- Анонимный visitor_id — случайная строка, которую браузер сам себе
-- присваивает и хранит в localStorage (не куки, не привязан к личности)
-- — нужен только чтобы отличать "тот же человек зашёл ещё раз" от
-- "разные люди", без какой-либо идентификации.
-- =====================================================================

create table if not exists public.page_views (
  id bigint generated always as identity primary key,
  visitor_id text not null,
  user_id uuid references auth.users (id) on delete set null,
  path text not null,
  created_at timestamptz not null default now()
);

alter table public.page_views enable row level security;

-- Записывать может кто угодно (в том числе анонимные посетители) — это
-- write-only с точки зрения обычного посетителя, ничего чувствительного.
drop policy if exists "page_views: anyone can insert" on public.page_views;
create policy "page_views: anyone can insert" on public.page_views
  for insert with check (true);

-- Читать (то есть видеть агрегированную статистику по всему сайту)
-- может только админ — обычные пользователи не должны видеть трафик
-- всей платформы.
drop policy if exists "page_views: admin read" on public.page_views;
create policy "page_views: admin read" on public.page_views
  for select using (public.is_admin());

create index if not exists page_views_created_at_idx on public.page_views (created_at desc);
create index if not exists page_views_visitor_created_idx on public.page_views (visitor_id, created_at);

-- test_attempts до сих пор разрешал читать только свои же попытки —
-- для статистики "самые популярные пробники" по всем пользователям
-- сразу нужен отдельный доступ для админа поверх этого.
drop policy if exists "test_attempts: admin read" on public.test_attempts;
create policy "test_attempts: admin read" on public.test_attempts
  for select using (public.is_admin());
