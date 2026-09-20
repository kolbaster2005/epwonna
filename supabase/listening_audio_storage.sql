-- =====================================================================
-- Хранилище аудиозаписей для аудирования (Hörverstehen) — EPD и, в
-- перспективе, любой другой предмет с устной/аудио частью письменного
-- экзамена. Отдельный бакет, не переиспользуем ничего существующего
-- (в проекте до сих пор вообще не было Supabase Storage — только
-- обычные таблицы).
--
-- Файлы физически заливаются через Dashboard (Storage → listening-audio
-- → Upload) — SQL не умеет закачивать бинарные файлы, только настраивать
-- сам бакет и права доступа. После загрузки публичная ссылка на файл
-- выглядит так:
--   https://<project-ref>.supabase.co/storage/v1/object/public/listening-audio/<путь-к-файлу>
-- Именно эту ссылку кладём в поле audioUrl внутри passages конкретного
-- пробника (см. пример UPDATE в конце файла).
-- =====================================================================

insert into storage.buckets (id, name, public)
values ('listening-audio', 'listening-audio', true)
on conflict (id) do nothing;

-- Публичное чтение — иначе браузер студента не сможет проиграть файл
-- (тот же принцип, что и у public read на questions/tests).
drop policy if exists "listening-audio: public read" on storage.objects;
create policy "listening-audio: public read" on storage.objects
  for select using (bucket_id = 'listening-audio');

-- Загружать/удалять файлы могут только админы — как и с любым другим
-- контентом на сайте.
drop policy if exists "listening-audio: admin write" on storage.objects;
create policy "listening-audio: admin write" on storage.objects
  for insert with check (bucket_id = 'listening-audio' and public.is_admin());

drop policy if exists "listening-audio: admin update" on storage.objects;
create policy "listening-audio: admin update" on storage.objects
  for update using (bucket_id = 'listening-audio' and public.is_admin());

drop policy if exists "listening-audio: admin delete" on storage.objects;
create policy "listening-audio: admin delete" on storage.objects
  for delete using (bucket_id = 'listening-audio' and public.is_admin());

-- ---------------------------------------------------------------------
-- Пример: добавить аудио к уже существующему Hörtext-заданию.
-- Замените test-id и путь на реальные — этот блок ничего не меняет
-- сам по себе, это шаблон для копирования.
--
-- passages — это JSONB-массив на самой строке tests (не на вопросе).
-- Если у пробника уже есть другие passages (например для Leseverstehen),
-- дописывайте новый объект в массив, а не заменяйте весь passages
-- целиком — иначе слетят существующие тексты для чтения.
-- ---------------------------------------------------------------------

-- update public.tests
-- set passages = passages || '[{
--   "id": "hoertext-1",
--   "title": "Hörtext 1: Single-Choice-Aufgabe — Arbeitswelt von heute (7 Punkte)",
--   "audioUrl": "https://<project-ref>.supabase.co/storage/v1/object/public/listening-audio/epd-schriftliche-2026-06/hoertext-1.mp3"
-- }]'::jsonb
-- where id = '<test-id>';

-- Дальше у каждого вопроса, который относится к этому Hörtext, поле
-- passage_id должно быть равно 'hoertext-1' — тем же способом, каким
-- уже привязываются вопросы к текстам для чтения:
--
-- update public.questions set passage_id = 'hoertext-1' where id in ('<question-id-1>', '<question-id-2>', ...);
