-- =====================================================================
-- ДЕМО-ЗАДАНИЯ ДЛЯ БАНКА ЗАДАНИЙ (EPD) — по одному на каждый из 12
-- реальных типов заданий, уже используемых в проекте.
--
-- КАК ЭТИМ ПОЛЬЗОВАТЬСЯ:
--   1. Выполните этот файл целиком в SQL Editor вашего проекта Supabase.
--   2. Первый INSERT создаёт (если ещё не существует) служебный
--      "пробник"-контейнер epd-task-bank — тот самый, что открывается
--      кнопкой "+ Добавить задание в банк" на странице /admin/epd/bank.
--      Если вы уже открывали эту страницу в админке — он уже
--      существует, и эта строка просто ничего не сделает.
--   3. Откройте /admin/epd/bank — все 12 заданий появятся в списке с
--      пометкой "Банк — без пробника".
--
-- Это ЗАГЛУШКИ для проверки формата (текст вопросов упрощён нарочно,
-- чтобы быстро увидеть результат), не финальный контент. Меняйте
-- text/jsonb на настоящий контент по этому же шаблону — колонки и
-- формат менять не нужно, только содержимое.
--
-- Для EPE (английский) — ровно тот же принцип, просто exam_key='epe' и
-- test_id='epe-task-bank' вместо epd.
-- =====================================================================

insert into public.tests (id, exam_key, title, short_description, is_official, is_task_bank, format, year, duration_minutes)
values ('epd-task-bank', 'epd', 'Банк заданий', 'Служебный контейнер — не показывается как пробник ученикам.', false, true, 'written', 2026, 0)
on conflict (id) do nothing;

-- 1. multiple_choice — варианты ответа (один или несколько верных)
insert into public.questions (id, test_id, position, category, type, text, options, correct_option_ids)
values
  ('epd-bank-demo-multiple-choice', 'epd-task-bank', 1, 'Чтение', 'multiple_choice',
   'Was ist laut Text der Hauptgrund für den Anstieg der Homeoffice-Quote?',
   '[{"id": "a", "text": "Bessere digitale Infrastruktur"}, {"id": "b", "text": "Sinkende Bürokosten"}, {"id": "c", "text": "Gesetzliche Vorschriften"}]'::jsonb, '["a"]'::jsonb)
on conflict (id) do nothing;

-- 2. true_false — набор утверждений верно/неверно
insert into public.questions (id, test_id, position, category, type, text, statements)
values
  ('epd-bank-demo-true-false', 'epd-task-bank', 2, 'Чтение', 'true_false',
   'Sind die folgenden Aussagen laut Text richtig oder falsch?',
   '[{"id": "s1", "text": "Die Umfrage wurde 2023 durchgeführt.", "correct": true}, {"id": "s2", "text": "Alle Befragten waren unter 30 Jahre alt.", "correct": false}]'::jsonb)
on conflict (id) do nothing;

-- 3. numeric — числовой ответ с погрешностью (для языков почти не
--    встречается, чаще в математике, но тип поддерживается везде)
insert into public.questions (id, test_id, position, category, type, text, correct_value, tolerance, unit)
values
  ('epd-bank-demo-numeric', 'epd-task-bank', 3, 'Грамматика', 'numeric',
   'Wie viele Prozent der Befragten arbeiten laut Text im Homeoffice? (Zahl ohne %-Zeichen)',
   45, 2, '%')
on conflict (id) do nothing;

-- 4. short_answer — короткий ответ, точное совпадение (список
--    допустимых вариантов написания)
insert into public.questions (id, test_id, position, category, type, text, accepted_answers)
values
  ('epd-bank-demo-short-answer', 'epd-task-bank', 4, 'Грамматика', 'short_answer',
   'Ergänzen Sie: Er interessiert sich ___ Politik. (richtige Präposition)',
   '["für"]'::jsonb)
on conflict (id) do nothing;

-- 5. heading_match — ввод последовательности букв/цифр (Wer sagt was?,
--    Fragen den Antworten zuordnen и подобные)
insert into public.questions (id, test_id, position, category, type, text, correct_sequence)
values
  ('epd-bank-demo-heading-match', 'epd-task-bank', 5, 'Чтение', 'heading_match',
   'Ordnen Sie jeder Person (1-3) die passende Aussage (A-C) zu und geben Sie die Buchstabenfolge ein.',
   'B, A, C')
on conflict (id) do nothing;

-- 6а. cloze — Lückentext, открытый короткий ответ на пропуск
insert into public.questions (id, test_id, position, category, type, text, cloze)
values
  ('epd-bank-demo-cloze-open', 'epd-task-bank', 6, 'Грамматика', 'cloze',
   'Ergänzen Sie die Lücke.',
   '{"template": "Die Studie zeigt, dass junge Menschen {1} häufiger von zu Hause arbeiten als früher.", "blanks": {"1": {"acceptedAnswers": ["deutlich", "wesentlich"]}}}'::jsonb)
on conflict (id) do nothing;

-- 6б. cloze — Multiple Choice Cloze, у каждого пропуска свой набор
--     вариантов
insert into public.questions (id, test_id, position, category, type, text, cloze)
values
  ('epd-bank-demo-cloze-choice', 'epd-task-bank', 7, 'Грамматика', 'cloze',
   'Choose the correct word for the gap.',
   '{"template": "She has been working here {1} five years.", "blanks": {"1": {"type": "choice", "options": [{"id": "a", "text": "since"}, {"id": "b", "text": "for"}, {"id": "c", "text": "during"}], "correctOptionId": "b"}}}'::jsonb)
on conflict (id) do nothing;

-- 6в. cloze — Multiple Matching через общий пул вариантов на все
--     пропуски сразу (часть вариантов — дистракторы)
insert into public.questions (id, test_id, position, category, type, text, cloze)
values
  ('epd-bank-demo-cloze-pool', 'epd-task-bank', 8, 'Чтение', 'cloze',
   'Wählen Sie für jede Lücke den passenden Satzteil (A-D). Zwei passen nicht.',
   '{"template": "Viele Firmen berichten, {1}, {2}.", "blanks": {"1": {"type": "choice", "options": [{"id": "A", "text": "dass die Produktivität gestiegen ist"}, {"id": "B", "text": "dass es zu Kommunikationsproblemen kam"}, {"id": "C", "text": "was niemand erwartet hatte"}, {"id": "D", "text": "obwohl die Kosten gesunken sind"}], "correctOptionId": "A"}, "2": {"type": "choice", "options": [{"id": "A", "text": "dass die Produktivität gestiegen ist"}, {"id": "B", "text": "dass es zu Kommunikationsproblemen kam"}, {"id": "C", "text": "was niemand erwartet hatte"}, {"id": "D", "text": "obwohl die Kosten gesunken sind"}], "correctOptionId": "D"}}}'::jsonb)
on conflict (id) do nothing;

-- 7а. qa_table — короткие ответы на вопросы к тексту
insert into public.questions (id, test_id, position, category, type, text, qa_table)
values
  ('epd-bank-demo-qa-table-short', 'epd-task-bank', 9, 'Чтение', 'qa_table',
   'Beantworten Sie die Fragen zum Text in Stichwörtern.',
   '{"rows": [{"id": "r1", "prompt": "Wie viele Personen wurden befragt?", "acceptedAnswers": ["500", "500 Personen"]}, {"id": "r2", "prompt": "In welchem Jahr fand die Umfrage statt?", "acceptedAnswers": ["2023"]}]}'::jsonb)
on conflict (id) do nothing;

-- 7б. qa_table — Editing: найти и исправить ошибку в каждой строке
insert into public.questions (id, test_id, position, category, type, text, qa_table)
values
  ('epd-bank-demo-qa-table-editing', 'epd-task-bank', 10, 'Грамматика', 'qa_table',
   'Each line contains one unnecessary or incorrect word. Write the correction.',
   '{"rows": [{"id": "r1", "prompt": "She has been living here for since 2015.", "acceptedAnswers": ["since", "for"]}]}'::jsonb)
on conflict (id) do nothing;

-- 7в. qa_table — Umformung: переформулирование без единственно верного
--     ответа (freeText: true), с самооценкой по баллам
insert into public.questions (id, test_id, position, category, type, text, qa_table, self_grade_max_points)
values
  ('epd-bank-demo-qa-table-umformung', 'epd-task-bank', 11, 'Грамматика', 'qa_table',
   'Formen Sie die unterstrichenen Strukturen in Nebensätze oder Infinitivkonstruktionen um.',
   '{"rows": [{"id": "r1", "prompt": "Trotz des schlechten Wetters ging sie spazieren.", "freeText": true}]}'::jsonb, 3)
on conflict (id) do nothing;

-- 8. tf_table — Richtig-Falsch mit Belegsatz (верно/неверно + первые 4
--    слова доказательного предложения)
insert into public.questions (id, test_id, position, category, type, text, tf_table)
values
  ('epd-bank-demo-tf-table', 'epd-task-bank', 12, 'Чтение', 'tf_table',
   'Sind die Aussagen richtig oder falsch? Notieren Sie auch die ersten vier Wörter des Belegsatzes.',
   '{"rows": [{"id": "r1", "statement": "Die Mehrheit der Befragten bevorzugt Homeoffice.", "correct": true, "words": ["Laut", "der", "Umfrage", "bevorzugen"]}]}'::jsonb)
on conflict (id) do nothing;

-- 9. multi_part — составной вопрос с несколькими независимо
--    проверяемыми пунктами (здесь: подбор заголовков к абзацам)
insert into public.questions (id, test_id, position, category, type, text, parts)
values
  ('epd-bank-demo-multi-part', 'epd-task-bank', 13, 'Чтение', 'multi_part',
   'Ordnen Sie jedem Abschnitt (A-B) die passende Überschrift zu.',
   '[{"id": "A", "label": "Abschnitt A", "type": "single_choice", "isExample": true, "options": [{"id": "1", "text": "Ein neuer Trend"}, {"id": "2", "text": "Kritische Stimmen"}], "correctOptionId": "1"}, {"id": "B", "label": "Abschnitt B", "type": "single_choice", "options": [{"id": "1", "text": "Ein neuer Trend"}, {"id": "2", "text": "Kritische Stimmen"}], "correctOptionId": "2"}]'::jsonb)
on conflict (id) do nothing;

-- 10. essay_choice — выбор одной из тем + сочинение (Schreibaufgabe)
insert into public.questions (id, test_id, position, category, type, text, essay_choice)
values
  ('epd-bank-demo-essay-choice', 'epd-task-bank', 14, 'Письмо', 'essay_choice',
   'Wählen Sie eines der beiden Themen und schreiben Sie einen Text (ca. 200 Wörter).',
   '{"options": [{"id": "a", "title": "Thema A: Digitalisierung der Arbeitswelt", "text": "", "instructions": ["Geben Sie einleitend die zentrale Aussage wieder.", "Nennen Sie Vor- und Nachteile.", "Formulieren Sie Ihre eigene Meinung."]}, {"id": "b", "title": "Thema B: Nachhaltiger Konsum", "text": "", "instructions": ["Beschreiben Sie das Problem.", "Nennen Sie mögliche Lösungen."]}]}'::jsonb)
on conflict (id) do nothing;

-- 11. free_text — свободный ответ без выбора темы, без автопроверки
--     (Blog Comment и подобные) — self_grade_max_points включает выбор
--     баллов вместо простого верно/неверно
insert into public.questions (id, test_id, position, category, type, text, self_grade_max_points)
values
  ('epd-bank-demo-free-text', 'epd-task-bank', 15, 'Письмо', 'free_text',
   'Lesen Sie den Blog-Kommentar unten und schreiben Sie Ihre eigene Antwort (150-200 Wörter).',
   20)
on conflict (id) do nothing;
