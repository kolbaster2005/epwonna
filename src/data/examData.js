// Static, rarely-changing config for the three exams (EPM / EPD / EPE) —
// colors, titles, topics, filter definitions, "about" text. This does NOT
// include the tests themselves: those are "database" data now, served
// asynchronously through src/services/testsService.js (seeded from
// Supabase's `tests`/`questions` tables, see src/services/testsService.js), because that's the part the admin panel edits
// and that will eventually come from Supabase. Keeping this file static
// and synchronous is deliberate — colors/branding aren't something an
// admin edits at runtime, so there's no reason to route them through the
// async service layer.
//
// ---- Shape this is standing in for (future DB tables) ------------------
//   topics                                  exam_filters
//   ─────────────────────────               ─────────────────────────
//   id            text PK                   exam_key   text
//   exam_key      text  (epm/epd/epe)        field      text  (e.g. 'topic',
//   label         text                                   'is_official', 'format')
//                                            label      text  (shown above the
//                                                         dropdown, e.g. "Тема")
//
// See supabase/schema.sql for the `tests` / `questions` shape.
//
// `exams[key].filters` below is the client-side stand-in for `exam_filters`:
// it lists which filter fields apply to that exam and how to label/render
// them. Topics themselves are a real table now (see
// src/services/topicsService.js), fetched separately.
// TestFilters.jsx filters purely by matching `test[field] === selectedValue`.

export const exams = {
  epm: {
    key: 'epm',
    label: 'EPM',
    title: 'EPM — экзамен по математике',
    subtitle: 'Официальные пробники для успешной сдачи',
    color: 'var(--blue)',
    colorDark: 'var(--blue-dark)',
    className: 'blue',
    homeTitle: 'Экзамен по математике',
    homeDesc: 'Подготовься к экзамену по математике с помощью официальных пробников и практических заданий.',
    timeLimitMinutes: 45,
    // Topics used to be hardcoded here — now a real, admin-editable
    // table (see src/services/topicsService.js and
    // src/pages/admin/AdminTopics.jsx).
    // Categories a written-test question can belong to — shown as the
    // grouped headings in the test-taking sidebar (TestPage.jsx groups
    // questions by whichever of these values is on question.category)
    // and, going forward, as the "Категория" dropdown when editing a
    // question in the admin panel. A category with no questions in it
    // just doesn't appear in the sidebar — nothing to configure for that.
    categories: [
      { value: 'Часть А', label: 'Часть А' },
      { value: 'Часть Б', label: 'Часть Б' },
    ],
    // Stand-in for `exam_filters` rows where exam_key = 'epm'. Each entry
    // says: render a dropdown for this test field, with this label and
    // these options. `options: 'topics'` means "fetch from the topics
    // table for this exam" (see topicsService.js); `options: 'years'`
    // means "compute from the years present in tests".
    filters: [
      {
        field: 'isOfficial',
        label: 'Тип пробника',
        options: [
          { value: 'true', label: 'Официальный' },
          { value: 'false', label: 'Неофициальный' },
        ],
      },
      { field: 'topic', label: 'Тема', options: 'topics' },
      { field: 'year', label: 'Год', options: 'years' },
    ],
    about: [
      {
        h: 'Краткая информация',
        content: [
          {
            type: 'list',
            items: [
              { lead: 'Формат:', text: 'экзамен состоит из двух частей — письменной и устной. Устную часть можно не сдавать, если вы успешно закрыли 3/4 бонус-теста на курсах VWU.' },
              { lead: 'Продолжительность письменной части:', text: '3 часа.' },
              { lead: 'Что можно использовать на экзамене:', text: 'разрешённый сборник формул и калькулятор.' },
              { lead: 'Регистрация:', text: 'необходимо зарегистрироваться на портале VWU.' },
            ],
          },
        ],
      },
      {
        h: 'Как проходит экзамен',
        content: [{ type: 'p', text: 'Экзамен состоит из двух частей: письменной и устной.' }],
        sub: [
          {
            h: 'Письменная часть',
            content: [
              { type: 'p', text: 'На письменную часть экзамена отводится 3 часа.' },
              { type: 'p', text: 'Экзамен включает 9 заданий и состоит из двух частей:' },
              { type: 'list', items: ['Часть А — 3 задания', 'Часть Б — 6 заданий'] },
              { type: 'p', text: 'Для успешной сдачи необходимо набрать не менее 50% баллов в каждой из частей.' },
              { type: 'p', text: 'Во время экзамена разрешено пользоваться калькулятором и официальным сборником формул.' },
              { type: 'p', text: 'После успешной сдачи письменной части вы допускаетесь к устному экзамену.' },
            ],
          },
          {
            h: 'Устная часть',
            content: [
              { type: 'note', text: 'Важно: устную часть можно не сдавать, если во время обучения на курсах VWU вы успешно закрыли ¾ бонус-тестов.' },
              { type: 'p', text: 'Устная часть состоит из 3 заданий. Заранее узнать, какие именно задания вам попадутся, невозможно, однако они построены по тому же принципу, что и задания письменной части.' },
              { type: 'p', text: 'После получения заданий вам даётся 20 минут на подготовку. Затем вы приходите к комиссии из трёх человек и объясняете, как решали предложенные задачи.' },
              { type: 'p', text: 'По отзывам студентов, если во время ответа вы допустили ошибку, но смогли самостоятельно её заметить и исправить, это не обязательно становится проблемой. Комиссия может показаться строгой, однако её цель — не специально вас «завалить», а проверить, насколько вы понимаете материал. Во время ответа экзаменаторы также могут задавать вопросы и помогать вам двигаться в правильном направлении.' },
            ],
          },
        ],
      },
      {
        h: 'Регистрация и стоимость',
        content: [
          { type: 'p', text: 'Подробнее о процессе регистрации можно прочитать на официальном сайте ФВУ.' },
          { type: 'p', text: 'Регистрация на экзамен проходит по одинаковому принципу для разных предметов: весь процесс осуществляется через портал ФВУ.' },
          { type: 'p', text: 'На момент августа 2026 года стоимость экзамена по математике составляет 66 €.' },
        ],
      },
      {
        h: 'Сколько попыток?',
        content: [
          { type: 'p', text: 'Всего у вас есть 5 попыток, чтобы сдать любой EP-экзамен.' },
          { type: 'p', text: 'Это значит, что если с первой попытки экзамен сдать не получилось, у вас остаются ещё четыре возможности.' },
        ],
      },
    ],
    usefulMaterials: {
      h: 'Полезные материалы и ссылки',
      content: [
        { type: 'p', text: 'Здесь собрали материалы, которые могут пригодиться при подготовке к экзамену:' },
        {
          type: 'list',
          ordered: true,
          // url: '#' — заглушка, замените на реальные ссылки/файлы,
          // когда они появятся (см. комментарий в README).
          items: [
            { lead: 'Разрешённый сборник формул', text: ' — его можно взять с собой на экзамен', url: 'https://drive.google.com/file/d/1eprBwCAleC1Jz8hcVQM04A5Uqzd8xxfp/view?usp=sharing' },
            { lead: 'Разрешённые формулы по теме «Векторы»', text: '.', url: 'https://drive.google.com/file/d/1Bzdao7i6r8asRA4-y3zSzBHQolQ8d_tY/view?usp=sharing' },
            { lead: '«EPM-Vorbereitungskurs»', text: 'волонтерский проект для ребят с украинским аттестатом', url: 'https://mmf.univie.ac.at/mathsplus/epm-course/' },
          ],
        },
      ],
    },
  },
  epd: {
    key: 'epd',
    label: 'EPD',
    title: 'EPD — экзамен по немецкому языку',
    subtitle: 'Модели и пробники экзаменов для успешной подготовки',
    color: 'var(--violet)',
    colorDark: 'var(--violet-dark)',
    className: 'violet',
    homeTitle: 'Экзамен по немецкому языку',
    homeDesc: 'Изучи все возможные типы заданий не только для письменного, но и для устного экзамена.',
    // Shown once before the monologue/dialogue choice screen on every
    // устная часть attempt for this exam — same text for every oral
    // test, so it lives here instead of being duplicated into every
    // test's oral_task JSON (see OralTestPage.jsx).
    oralExamInfo: `К устному экзамену допускаются только те, кто сдал письменную часть экзамена. Устный экзамен можно пересдавать максимум четыре раза.

Ход экзамена: экзамен состоит из монологической и диалогической части. На подготовку к монологической части даётся минимум 15 минут, диалогическую часть нужно проходить спонтанно, без подготовки.

В начале времени подготовки вам выдают два задания (например, связанных с графиком, статистикой, коротким текстом для чтения и т. д.) по двум разным темам. Нужно выбрать одно из двух заданий, чтобы подготовить по нему краткую презентацию, опираясь на вспомогательные вопросы. На это даётся минимум 15 минут. При этом можно пользоваться одноязычным словарём, предоставленным VWU. Можно делать заметки (ключевые слова), чтобы ничего не забыть во время презентации, которая должна длиться около 5 минут. Говорить нужно свободно, а не зачитывать написанное.

Импульс для диалогической части выдаётся только после презентации — то есть уже во время самого экзамена. Это может быть картинка, график, цитата и т. д., на основе которых нужно спонтанно провести с экзаменатором беседу продолжительностью около пяти минут.

Экзаменационная комиссия состоит из трёх человек: вашего экзаменатора, ещё одного преподавателя VWU и представителя университета.`,
    timeLimitMinutes: 30,
    // Categories apply to the written phase only — the oral phase uses
    // oralTask.stages instead of questions/categories entirely (see the
    // schema note in seedTests.js / supabase/schema.sql).
    categories: [
      { value: 'Чтение', label: 'Чтение' },
      { value: 'Аудирование', label: 'Аудирование' },
      { value: 'Грамматика', label: 'Грамматика' },
      { value: 'Письмо', label: 'Письмо' },
    ],
    // Stand-in for a `phases` column/table: EPD (and EPE, below) has a
    // written and an oral phase, each with its own set of tests. Exams
    // without this field (EPM) just don't render the phase switcher.
    phases: [
      { value: 'written', label: 'Письменная часть' },
      { value: 'oral', label: 'Устная часть' },
    ],
    filters: [
      { field: 'topic', label: 'Тема', options: 'topics' },
      { field: 'year', label: 'Год', options: 'years' },
    ],
    about: [
      {
        h: 'Краткая информация',
        content: [
          {
            type: 'list',
            items: [
              { lead: 'Формат:', text: 'экзамен состоит из письменной и устной части. К устной части допускают только тех, кто получил положительную оценку за письменную.' },
              { lead: 'Продолжительность письменной части:', text: '180 минут (3 часа).' },
              { lead: 'Что можно использовать:', text: 'на письменной части — ничего, словари и электронные средства запрещены. На устной части, во время подготовки к монологу, — одноязычный словарь, который предоставляет VWU.' },
              { lead: 'Регистрация:', text: 'только онлайн, на сайте VWU. Экзамен проводится 6 раз в год; после окончания срока подачи заявок зарегистрироваться нельзя.' },
              { lead: 'Попыток:', text: 'до 5 (первая попытка плюс до 4 пересдач) — отдельно для письменной и отдельно для устной части.' },
            ],
          },
        ],
      },
      {
        h: 'Как проходит экзамен',
        content: [
          { type: 'p', text: 'Экзамен состоит из двух частей: письменной и устной.' },
        ],
        sub: [
          {
            h: 'Письменная часть',
            content: [
              { type: 'note', text: 'К устной части допускают только тех, кто сдал письменную (оценка 1–4). Если письменная часть не сдана (оценка 5), можно пересдать позже — всего до 4 раз.' },
              { type: 'p', text: 'Общая продолжительность письменной части — 180 минут. Экзамен состоит из 4 частей:' },
              {
                type: 'list',
                ordered: true,
                items: [
                  'Чтение (Leseverstehen) — 50 минут',
                  'Аудирование (Hörverstehen) — 35 минут',
                  'Грамматика и лексика (Strukturen und Wortschatz) — 35 минут',
                  'Письмо (Textproduktion) — 60 минут',
                ],
              },
              { type: 'note', text: 'Словари и любые электронные средства на письменной части не разрешены. Черновики и записи нужно сдать в конце экзамена.' },
            ],
            sub: [
              {
                h: 'Чтение',
                content: [
                  { type: 'p', text: 'Вам дадут два или три текста с разными типами заданий. Нужно показать, что вы поняли содержание текстов.' },
                ],
              },
              {
                h: 'Аудирование',
                content: [
                  { type: 'p', text: 'Вам дадут две аудиозаписи с разными типами заданий. Каждая запись прозвучит дважды. Нужно показать, что вы поняли содержание.' },
                ],
              },
              {
                h: 'Грамматика и лексика',
                content: [
                  { type: 'p', text: 'Нужно показать, что вы понимаете даже более сложные грамматические конструкции, умеете правильно их изменять или дополнять, а ваша речь — достаточно разнообразная, точная по содержанию и стилистически развитая.' },
                ],
              },
              {
                h: 'Письмо',
                content: [
                  { type: 'p', text: 'Можно выбрать одну из двух предложенных тем. К каждой теме прилагается отрывок текста или график — как отправная точка. Нужно показать, что вы понимаете тему и умеете развить собственную аргументацию: текст нужно написать самостоятельно, заученные наизусть тексты не принимаются.' },
                ],
              },
              {
                h: 'Результаты и проходной балл',
                content: [
                  { type: 'p', text: 'Результат письменной части приходит по электронной почте. При положительной оценке (1–4) вам сообщат дату устной части. При отрицательной (5) — можно пересдать позже, всего до 4 пересдач.' },
                  { type: 'p', text: 'Чтобы сдать письменную часть, нужно одновременно набрать минимальный балл в каждой из 4 частей и не менее 45 баллов в сумме:' },
                  {
                    type: 'list',
                    items: [
                      'Чтение — минимум 10 из 20 баллов',
                      'Аудирование — минимум 5 из 15 баллов',
                      'Грамматика и лексика — минимум 7 из 15 баллов',
                      'Письмо — минимум 12 из 25 баллов',
                    ],
                  },
                  { type: 'p', text: 'Шкала оценок (по сумме баллов, максимум 75):' },
                  {
                    type: 'list',
                    items: [
                      { lead: '75–69 баллов —', text: ' отлично (1).' },
                      { lead: '68,5–61 баллов —', text: ' хорошо (2).' },
                      { lead: '60,5–53 баллов —', text: ' удовлетворительно (3).' },
                      { lead: '52,5–45 баллов —', text: ' достаточно (4).' },
                      { lead: '44,5–0 баллов —', text: ' недостаточно, экзамен не сдан (5).' },
                    ],
                  },
                ],
              },
            ],
          },
          {
            h: 'Устная часть',
            content: [
              { type: 'note', text: 'К устной части допускают только тех, кто сдал письменную. Устную часть можно пересдавать максимум 4 раза.' },
              { type: 'p', text: 'Экзамен состоит из монологической и диалогической части: на монологическую даётся минимум 15 минут подготовки, диалогическую нужно проходить спонтанно, без подготовки.' },
              { type: 'note', text: 'Экзаменационная комиссия состоит из трёх человек: вашего экзаменатора, ещё одного преподавателя VWU и представителя университета.' },
            ],
            sub: [
              {
                h: '1. Подготовка и монолог',
                meta: { icon: 'clock', label: 'от 15 мин' },
                content: [
                  { type: 'p', text: 'В начале времени подготовки вам дают два задания на разные темы (например, связанных с графиком, статистикой или коротким текстом для чтения). Нужно выбрать одно из двух, чтобы подготовить по нему краткую презентацию, опираясь на наводящие вопросы.' },
                  { type: 'p', text: 'На подготовку — минимум 15 минут. Можно пользоваться одноязычным словарём, который предоставляет VWU.' },
                  { type: 'p', text: 'Можно делать заметки (ключевые слова), чтобы ничего не забыть во время презентации — она должна длиться около 5 минут. Говорить нужно свободно, а не зачитывать написанное.' },
                ],
              },
              {
                h: '2. Спонтанный диалог',
                meta: { icon: 'group' },
                content: [
                  { type: 'p', text: 'Импульс для диалогической части вы получаете только после презентации — то есть уже во время самого экзамена. Это может быть картинка, график, цитата и т. д.' },
                  { type: 'p', text: 'На основе этого импульса нужно спонтанно провести с экзаменатором беседу продолжительностью около пяти минут.' },
                ],
              },
            ],
          },
        ],
      },
      {
        h: 'Регистрация и стоимость',
        content: [
          { type: 'p', text: 'Подробнее о процессе регистрации можно прочитать на официальном сайте VWU.' },
          { type: 'p', text: 'Регистрация проходит только онлайн, через портал VWU. В год предлагается 6 экзаменационных дат — точные даты регистрации и самого экзамена публикуются на сайте VWU.' },
          { type: 'note', text: 'Регистрация после окончания срока подачи заявок невозможна — следите за сроками заранее.' },
          { type: 'p', text: 'На момент августа 2026 года стоимость экзамена по немецкому языку составляет 66 €.' },
        ],
      },
      {
        h: 'Сколько попыток?',
        content: [
          { type: 'p', text: 'Письменную часть можно пересдавать до 4 раз (всего до 5 попыток, включая первую).' },
          { type: 'p', text: 'Устную часть — тоже до 4 пересдач, но отдельно от письменной: попытки считаются независимо для каждой части.' },
        ],
      },
    ],

    topicsList: {
      h: 'Список тем',
      content: [{ type: 'p', text: 'Официальный список тем для подготовки к экзамену — на них может строиться и письменная, и устная часть. Нажмите на тему, чтобы раскрыть подпункты.' }],
      sub: [
        { h: 'Arbeitswelt und Wirtschaft', content: [{ type: 'list', items: ['Berufswahl', 'Arbeitsbedingungen', 'Veränderungen der Arbeitswelt', 'Frauen in der Arbeitswelt'] }] },
        { h: 'Beziehungen und Geschlechtergerechtigkeit', content: [{ type: 'list', items: ['Beziehungen innerhalb und außerhalb der Familie', 'Formen des Zusammenlebens', 'Mann – Frau', 'Generationen', 'Freundschaft', 'Gleichstellung der Geschlechter'] }] },
        { h: 'Gesellschaft und soziales Engagement', content: [{ type: 'list', items: ['Menschenrechte', 'Umgang mit Minderheiten', 'Ehrenamt', 'Werte', 'Diversität', 'Armut'] }] },
        { h: 'Konsumgesellschaft', content: [{ type: 'list', items: ['Einkaufsverhalten', 'Rolle der Werbung', 'Online-Shopping vs. stationärer Handel', 'Wegwerfgesellschaft', 'Fairer Handel'] }] },
        { h: 'Körperliche und mentale Gesundheit', content: [{ type: 'list', items: ['Ernährung und Lebensstil', 'Bewegung und Sport', 'Abhängigkeiten', 'psychisches Wohlbefinden'] }] },
        { h: 'Lernen, Bildung, Studium, Wissenschaft', content: [{ type: 'list', items: ['Ausbildung', 'Lern- und Studiertechniken', 'Sprachen lernen', 'Gründe für Studienwahl', 'Studienvoraussetzungen', 'Studieren im Ausland', 'Studienfinanzierung', 'wissenschaftliches Arbeiten und Forschung'] }] },
        { h: 'Medien', content: [{ type: 'list', items: ['Formen und Funktionen von Medien', 'Printmedien, digitale Medien, soziale Medien', 'Medienkompetenz', 'verlässliche Quellen', 'Datensicherheit', 'Gefahren und Chancen von Medien', 'Internetsucht', 'Manipulation', 'kollaboratives Lernen und Arbeiten', 'einfacher Zugang zu Information', 'neue Kommunikationsmöglichkeiten', 'Künstliche Intelligenz'] }] },
        { h: 'Tourismus und Reisen', content: [{ type: 'list', items: ['Vor- und Nachteile von verschiedenen Arten des Reisens', 'Auswirkungen auf Wirtschaft, Umwelt, Verkehr, Infrastruktur', 'alternative Formen des Reisens'] }] },
        { h: 'Wohnen', content: [{ type: 'list', items: ['Wohnformen', 'Wohnqualität', 'Stadt – Land', 'Stadtplanung', 'Gentrifizierung'] }] },
        { h: 'Umwelt', content: [{ type: 'list', items: ['Klimaveränderung', 'Klimaziele', 'Energiewende', 'Umweltverschmutzung und Ressourcenverbrauch', 'Abfallproblematik', 'Bodenverbrauch', 'Bodenversiegelung', 'Kreislaufwirtschaft', 'Verkehrsprobleme', 'Mobilitätskonzepte'] }] },
      ],
    },
  },
  epe: {
    key: 'epe',
    label: 'EPE',
    title: 'EPE — экзамен по английскому языку',
    subtitle: 'Материалы, тексты и пробники, собранные в одном месте — бесплатно',
    color: 'var(--teal)',
    colorDark: 'var(--teal-dark)',
    className: 'teal',
    homeTitle: 'Экзамен по английскому языку',
    homeDesc: 'Эффективная подготовка к экзамену по английскому языку: грамматика, лексика, и пробники по обеим частям.',
    oralExamInfo: `На устном экзамене вам предложат две темы из пула тем. Вы выбираете одну из них, и после того как сделаете выбор, получите стимул (изображения), который будете обсуждать с экзаменатором около семи минут. На подготовку даётся около 20 минут. Словари не разрешены.

При оценке устной речи учитываются следующие аспекты:
— выполнение задания (чёткие и убедительные аргументы; задание раскрыто полностью);
— беглость речи, интонация и взаимодействие (темп; связность идей; лёгкость выражения мыслей; уместные паузы, отсутствие запинок);
— диапазон языковых средств (словарный запас и грамматические конструкции);
— точность речи (лексический и грамматический контроль; произношение).`,
    timeLimitMinutes: 30,
    categories: [
      { value: 'Чтение', label: 'Чтение' },
      { value: 'Аудирование', label: 'Аудирование' },
      { value: 'Грамматика', label: 'Грамматика' },
      { value: 'Письмо', label: 'Письмо' },
    ],
    phases: [
      { value: 'written', label: 'Письменная часть' },
      { value: 'oral', label: 'Устная часть' },
    ],
    filters: [
      { field: 'topic', label: 'Тема', options: 'topics' },
      { field: 'year', label: 'Год', options: 'years' },
    ],
    about: [
      {
        h: 'Краткая информация',
        content: [
          {
            type: 'list',
            items: [
              { lead: 'Формат:', text: 'экзамен состоит из письменной и устной части. К устной части допускают только тех, кто сдал письменную.' },
              { lead: 'Продолжительность письменной части:', text: '150 минут (2,5 часа).' },
              { lead: 'Что можно использовать:', text: 'ничего — словари запрещены и на письменной, и на устной части.' },
              { lead: 'Регистрация:', text: 'необходимо зарегистрироваться на портале VWU.' },
            ],
          },
        ],
      },
      {
        h: 'Как проходит экзамен',
        content: [
          { type: 'p', text: 'Экзамен состоит из двух частей: письменной и устной.' },
        ],
        sub: [
          {
            h: 'Письменная часть',
            content: [
              { type: 'note', text: 'К устной части допускают только тех, кто сдал письменную.' },
              { type: 'p', text: 'Общая продолжительность письменной части — 150 минут. Экзамен состоит из 3 частей:' },
              {
                type: 'list',
                ordered: true,
                items: [
                  'Reading Comprehension (чтение) — 50 минут, максимум 20 баллов',
                  'Language in Use (грамматика и лексика) — 40 минут, максимум 20 баллов',
                  'Text Production (письмо) — 60 минут, максимум 20 баллов',
                ],
              },
              { type: 'note', text: 'Словари не разрешены ни в одной из частей письменного экзамена.' },
            ],
            sub: [
              {
                h: 'Reading Comprehension',
                content: [
                  { type: 'p', text: 'Задания на понимание прочитанного — несколько текстов с разными типами заданий.' },
                ],
              },
              {
                h: 'Language in Use',
                content: [
                  { type: 'p', text: 'Задания на грамматику и словарный запас — умение правильно применять грамматические конструкции в контексте.' },
                ],
              },
              {
                h: 'Text Production',
                content: [
                  { type: 'p', text: 'Один тип задания — Blog Comment. Вам даётся фрагмент блога или поста, в котором человек делится своим мнением на определённую тему. Нужно написать собственный ответ на этот комментарий, придерживаясь заданной темы и формата.' },
                ],
              },
              {
                h: 'Результаты и проходной балл',
                content: [
                  { type: 'p', text: 'Максимум за каждую из 3 частей — 20 баллов, всего максимум 60 баллов.' },
                  { type: 'p', text: 'Чтобы получить положительную оценку, нужно одновременно:' },
                  {
                    type: 'list',
                    items: [
                      'набрать минимум 9 из 20 баллов в каждой из 3 частей',
                      'и минимум 36 из 60 баллов в сумме',
                    ],
                  },
                ],
              },
            ],
          },
          {
            h: 'Устная часть',
            content: [
              { type: 'note', text: 'К устной части допускают только тех, кто сдал письменную.' },
              { type: 'p', text: 'Вам дадут на выбор две темы из пула тем. Вы выбираете одну — и после этого получаете стимул (изображение, график, цитата и т. д.), который будете обсуждать с экзаменатором около семи минут.' },
              { type: 'p', text: 'На подготовку даётся около 20 минут. Словари не разрешены.' },
              { type: 'p', text: 'При оценке устной речи учитываются следующие аспекты:' },
              {
                type: 'list',
                items: [
                  { lead: 'Task achievement —', text: ' насколько чётко и убедительно раскрыта тема задания.' },
                  { lead: 'Fluency, intonation & interaction —', text: ' темп речи, связность идей, лёгкость выражения мыслей, уместные паузы, отсутствие запинок.' },
                  { lead: 'Range of spoken language —', text: ' разнообразие словарного запаса и грамматических конструкций.' },
                  { lead: 'Accuracy of spoken language —', text: ' лексическая и грамматическая точность, произношение.' },
                ],
              },
            ],
          },
        ],
      },
      {
        h: 'Регистрация и стоимость',
        content: [
          { type: 'p', text: 'Подробнее о процессе регистрации можно прочитать на официальном сайте VWU.' },
          { type: 'p', text: 'Регистрация на экзамен проходит по одинаковому принципу для разных предметов: весь процесс осуществляется через портал VWU.' },
          { type: 'p', text: 'На момент августа 2026 года стоимость экзамена по английскому языку составляет 66 €.' },
        ],
      },
      {
        h: 'Сколько попыток?',
        content: [
          { type: 'p', text: 'Всего у вас есть 5 попыток, чтобы сдать любой EP-экзамен.' },
        ],
      },
    ],

    topicsList: {
      h: 'Список тем',
      content: [
        { type: 'p', text: 'Официальный список тем для подготовки к экзамену — на них может строиться и письменная, и устная часть. Ниже — основные разделы; полный список с подпунктами будет добавлен позже.' },
        { type: 'list', ordered: true, items: ['Family, Friends and Relationships', 'Hobbies, Free-time Activities and Celebrating Special Events', 'Health and Nutrition', 'Homes and Living; Countries, Cities, Hometowns', 'Shopping, Consumerism, Clothes & Fashion', 'World of Work, Jobs', 'Education, University and Language Learning', 'Media and Communication', 'Travel, Tourism, Means of Transport', 'Environmental Issues and Change'] },
        {
          type: 'list',
          // url: '#' — заглушка, замените на реальную ссылку/файл с
          // полным списком тем (с подпунктами), когда он появится.
          items: [
            { lead: 'Более подробный список тем', text: '', url: '#' },
          ],
        },
      ],
    },
  },
}

export const examList = Object.values(exams)
