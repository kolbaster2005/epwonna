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
    hidePracticeTab: true,
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
    filters: [],
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

    // "Теория" tab (see ExamPage.jsx: rendered whenever exam.theory is set,
    // same as usefulMaterials below).
    theory: {
      h: 'Теория',
      sub: [
        {
          h: 'Список тем',
          sub: [
            {
              h: 'Список тем',
              downloadUrl: 'https://drive.google.com/file/d/10aaARhvd0w-k8Utq8Av_ZqYGGT5CiVLq/view?usp=sharing',
            },
          ],
        },
        {
          h: 'Грамматика',
          sub: [
            {
              h: 'Памятка Doppelkonjunktionen',
              downloadUrl: 'https://drive.google.com/file/d/18mNEZuRo_EN-dqRv6F5kBVoVfRpvdGOI/view?usp=sharing',
              content: [
                { type: 'p', text: 'Двойные союзы (Doppelkonjunktionen) — устойчивые пары слов, которые связывают между собой два элемента предложения.' },
                {
                  type: 'table',
                  headers: ['Doppelkonjunktion', 'Beispiel', 'Anmerkung'],
                  rows: [
                    [
                      ['nicht nur … sondern auch', '(не только …, но и)'],
                      [
                        '__Nicht nur__ die Arbeitsbedingungen, __sondern auch__ das Gehalt spielen bei der Berufswahl eine wichtige Rolle.',
                        'Перевод: Не только условия труда, но и зарплата играют важную роль при выборе профессии.',
                      ],
                      '',
                    ],
                    [
                      ['entweder … oder', '(либо … либо / или … или)'],
                      [
                        '__Entweder__ wir fahren mit dem Zug, __oder__ wir mieten ein Auto.',
                        'Перевод: Либо мы поедем на поезде, либо возьмём машину напрокат.',
                      ],
                      '',
                    ],
                    [
                      ['sowohl … als (auch)', '(как … так и)'],
                      [
                        '__Sowohl__ die Mitarbeiter __als auch__ die Kunden waren mit der neuen Regelung unzufrieden.',
                        'Перевод: И сотрудники, и клиенты были недовольны новым правилом.',
                      ],
                      '',
                    ],
                    [
                      ['weder … noch', '(ни … ни)'],
                      [
                        '__Weder__ die hohen Kosten __noch__ der lange Anfahrtsweg konnten ihn davon abhalten, die Stelle anzunehmen.',
                        'Перевод: Ни высокие расходы, ни долгое время в пути не смогли помешать ему принять эту должность.',
                      ],
                      'Важно: дополнительное nicht обычно НЕ требуется: Ich trinke weder Kaffee noch Tee.',
                    ],
                    [
                      ['je …, desto / umso', '(чем …, тем …)'],
                      [
                        '__Je__ mehr man sich mit einem Thema beschäftigt, __desto__ besser versteht man die Zusammenhänge.',
                        'Перевод: Чем больше человек занимается какой-либо темой, тем лучше он понимает взаимосвязи.',
                      ],
                      'Порядок слов: после je — придаточное предложение, глагол в конце. После desto/umso — инверсия: desto + сравнительная степень + Verb + Subjekt.',
                    ],
                    [
                      ['zwar … aber', '(хотя …, но)'],
                      [
                        '__Zwar__ ist die Wohnung ziemlich teuer, __aber__ sie liegt direkt im Stadtzentrum.',
                        'Перевод: Квартира действительно довольно дорогая, но она находится прямо в центре города.',
                      ],
                      '',
                    ],
                    [
                      ['einerseits … andererseits', '(с одной стороны … с другой стороны)'],
                      [
                        '__Einerseits__ bietet das Homeoffice mehr Flexibilität, __andererseits__ kann die Trennung zwischen Berufs- und Privatleben schwieriger werden.',
                        'Перевод: С одной стороны, работа из дома предоставляет больше гибкости, с другой стороны, разделение между профессиональной и личной жизнью может стать сложнее.',
                      ],
                      'Порядок слов: при начале с einerseits/andererseits — инверсия: Einerseits bietet … / Andererseits kann …',
                    ],
                    [
                      ['teils … teils', '(отчасти … отчасти / частично … частично)'],
                      [
                        'Die Teilnehmer waren __teils__ begeistert, __teils__ enttäuscht von den Ergebnissen der Veranstaltung.',
                        'Перевод: Участники были отчасти воодушевлены, отчасти разочарованы результатами мероприятия.',
                      ],
                      '',
                    ],
                  ],
                },
              ],
            },
            {
              h: 'Памятка Umformungen',
              downloadUrl: 'https://drive.google.com/file/d/1GIdgvsbwJUQXapDFUvgvAJeyrPwXz5Nn/view?usp=drive_link',
              intro: 'Nominalisierungen: Umformung Nominalphrase → Verbalphrase. Важно следить за тем, чтобы менялась только грамматическая структура (Nomen → Verb, существительное → глагол), но не содержание.',
              rules: [
            {
              number: '01',
              title: 'Präposition + Nomen → Nebensatz',
              description: 'Придаточное предложение вместо предлога + существительного.',
              example: {
                text: 'Trotz der Kälte joggt sie jeden Morgen.',
                translation: 'Несмотря на холод, она каждое утро бегает.',
              },
              transformation: {
                text: 'Obwohl es kalt ist, joggt sie jeden Morgen.',
                translation: 'Хотя холодно, она каждое утро бегает.',
              },
              merke: ['Präposition → Konjunktion', 'Nomen → Verb (Unterordnung)'],
              important: 'Важно: в придаточном предложении важны правильное время глагола и явное подлежащее!',
              changes: [['trotz', 'obwohl'], ['der Kälte', 'es kalt ist']],
            },
            {
              number: '02',
              title: 'Partizip / Adjektiv → Relativsatz',
              description: 'Определение через относительное придаточное предложение.',
              example: {
                text: 'Der schlafende Hund liegt vor der Tür, der geweckte Hund bellt laut.',
                translation: 'Спящая собака лежит перед дверью, разбуженная собака громко лает.',
              },
              transformation: {
                text: 'Der Hund, der schläft, liegt vor der Tür. Der Hund, der geweckt worden ist, bellt laut.',
                translation: 'Собака, которая спит, лежит перед дверью. Собака, которую разбудили, громко лает.',
              },
              merke: ['Partizip I (причастие I) = одновременность действия', 'Partizip II (причастие II) = предшествующее действие, чаще всего в пассиве (страдательном залоге)!'],
              changes: [['schlafende', 'der schläft'], ['geweckte', 'der geweckt worden ist']],
            },
            {
              number: '03',
              title: 'Präposition + Partizip + Nomen → Nebensatz',
              description: 'Причастный оборот с предлогом превращается в придаточное предложение.',
              example: {
                text: 'Wegen der sinkenden Verkaufszahlen musste die Firma Mitarbeiter entlassen.',
                translation: 'Из-за падающих показателей продаж фирме пришлось уволить сотрудников.',
              },
              transformation: {
                text: 'Weil die Verkaufszahlen sinken, musste die Firma Mitarbeiter entlassen.',
                translation: 'Так как показатели продаж падают, фирме пришлось уволить сотрудников.',
              },
              merke: ['Причастие → глагол', 'Предлог → союз'],
              important: 'Важно: в придаточном предложении важны правильное время глагола и явное подлежащее!',
              changes: [['wegen', 'weil'], ['der sinkenden Verkaufszahlen', 'die Verkaufszahlen sinken']],
            },
            {
              number: '04',
              title: 'Verb + Präposition + Nomen → Pronominaladverb + dass / Infinitiv + zu',
              description: 'Существительное с предлогом при глаголе заменяется придаточным dass-предложением с местоименным наречием — или инфинитивным оборотом, если подлежащее одинаковое.',
              example: {
                text: 'Er interessiert sich für das Erlernen neuer Sprachen.',
                translation: 'Он интересуется изучением новых языков.',
              },
              transformation: {
                text: 'Er interessiert sich dafür, dass er neue Sprachen lernt.',
                translation: 'Он интересуется тем, что изучает новые языки.',
              },
              merke: ['Verb + Präposition + Nomen → Pronominaladverb (da(r) + Präposition) + dass-Satz', '= Er interessiert sich dafür, neue Sprachen zu lernen. — если подлежащее одинаковое в обеих частях, можно инфинитивный оборот'],
              changes: [['für das Erlernen', 'dafür, dass er lernt']],
            },
            {
              number: '05',
              title: 'Ergänzung (Subjekt oder Objekt) → dass-Satz / Infinitiv + zu',
              description: 'Существительное-подлежащее или дополнение заменяется придаточным dass-предложением или инфинитивным оборотом.',
              example: {
                text: 'Eine Verschiebung des Termins auf nächste Woche ist notwendig.',
                translation: 'Перенос срока на следующую неделю необходим.',
              },
              transformation: {
                text: 'Es ist notwendig, dass der Termin auf nächste Woche verschoben wird.',
                translation: 'Необходимо, чтобы срок был перенесён на следующую неделю.',
              },
              merke: ['Es ist notwendig, dass man den Termin auf nächste Woche verschiebt. — активный залог', 'Es ist notwendig, den Termin auf nächste Woche zu verschieben. — инфинитивный оборот'],
              changes: [['eine Verschiebung', 'dass ... verschoben wird']],
            },

              ],
              content: [
{ type: 'heading', text: 'Подробнее про предлоги (к правилу №1)' },
                {
                  type: 'p',
                  text: 'Памятка-решение по теме «Umformung Nominalphrasen → Verbalphrasen»: слева — предлог и примеры с существительным, справа — соответствующий союз и та же мысль, выраженная придаточным предложением.',
                },
                {
                  type: 'table',
                  headers: ['Präposition', 'Beispiele', 'Konjunktion', 'Beispiele'],
                  rows: [
                    [
                      'durch + A',
                      [
                        '__Durch__ regelmäßiges Training verbesserte er seine Kondition.',
                        '__Durch__ die Reduzierung des Plastikmülls schützt man die Umwelt.',
                      ],
                      'indem / dadurch, dass',
                      [
                        'Indem er regelmäßig trainierte, verbesserte er seine Kondition.',
                        'Dadurch, dass man den Plastikmüll reduziert, schützt man die Umwelt.',
                      ],
                    ],
                    [
                      'trotz + G',
                      [
                        '__Trotz__ seiner Erkältung ging er zur Arbeit.',
                        '__Trotz__ des schlechten Wetters fand das Fest statt.',
                      ],
                      'obwohl',
                      [
                        'Obwohl er erkältet war, ging er zur Arbeit.',
                        'Obwohl das Wetter schlecht war, fand das Fest statt.',
                      ],
                    ],
                    [
                      'wegen / aufgrund + G',
                      [
                        '__Wegen__ des dichten Nebels fielen mehrere Flüge aus.',
                        '__Aufgrund__ der hohen Nachfrage stiegen die Preise.',
                      ],
                      'weil / da',
                      [
                        'Weil dichter Nebel herrschte, fielen mehrere Flüge aus.',
                        'Da die Nachfrage hoch war, stiegen die Preise.',
                      ],
                    ],
                    [
                      'ohne + A',
                      [
                        'Er verließ das Büro __ohne__ ein Wort.',
                        'Sie traf die Entscheidung __ohne__ Rücksprache mit dem Team.',
                      ],
                      'ohne, dass / ohne + zu + Inf. (gleiches Sub.)',
                      [
                        'Er verließ das Büro, ohne ein Wort zu sagen.',
                        'Sie traf die Entscheidung, ohne sich mit dem Team abzusprechen.',
                      ],
                    ],
                    [
                      'statt + G',
                      [
                        '__Statt__ einer Antwort schickte er nur ein Emoji.',
                        '__Statt__ des Autos nahm sie das Fahrrad zur Arbeit.',
                      ],
                      'statt, dass / statt + zu + Inf. (gleiches Sub.)',
                      [
                        'Statt zu antworten, schickte er nur ein Emoji.',
                        'Statt das Auto zu nehmen, fuhr sie mit dem Fahrrad zur Arbeit.',
                      ],
                    ],
                    [
                      'während + G',
                      [
                        '__Während__ der Reise las er drei Bücher.',
                        '__Während__ des Vortrags schlief ein Zuhörer ein.',
                      ],
                      'während',
                      [
                        'Während er reiste, las er drei Bücher.',
                        'Während der Vortrag lief, schlief ein Zuhörer ein.',
                      ],
                    ],
                    [
                      'nach + D (=laut) / laut + D (=nach)',
                      [
                        '__Nach__ (=laut) Angaben der Polizei war die Straße gesperrt.',
                        '__Laut__ (=nach) Aussage des Zeugen fuhr der Wagen zu schnell.',
                      ],
                      'wie',
                      [
                        'Wie die Polizei angibt, war die Straße gesperrt.',
                        'Wie der Zeuge aussagt, fuhr der Wagen zu schnell.',
                      ],
                    ],
                    [
                      'bis zu + D',
                      [
                        '__Bis zum__ Ende der Ausstellung kamen tausend Besucher.',
                        '__Bis zum__ Beginn der Sitzung bleibt die Tür offen.',
                      ],
                      'bis',
                      [
                        'Bis die Ausstellung endete, kamen tausend Besucher.',
                        'Bis die Sitzung beginnt, bleibt die Tür offen.',
                      ],
                    ],
                    [
                      'seit + D',
                      [
                        '__Seit__ ihrem Umzug nach Graz arbeitet sie im Homeoffice.',
                        '__Seit__ der Einführung neuer Regeln gibt es weniger Beschwerden.',
                      ],
                      'seit / seitdem',
                      [
                        'Seit sie nach Graz umgezogen ist, arbeitet sie im Homeoffice.',
                        'Seitdem neue Regeln eingeführt wurden, gibt es weniger Beschwerden.',
                      ],
                    ],
                    [
                      'vor + D',
                      [
                        '__Vor__ dem Frühstück macht sie Yoga.',
                        '__Vor__ der Abreise packten wir die Koffer.',
                      ],
                      'bevor',
                      [
                        'Bevor sie frühstückt, macht sie Yoga.',
                        'Bevor wir abreisten, packten wir die Koffer.',
                      ],
                    ],
                    [
                      'bei + D',
                      [
                        '__Bei__ starkem Regen bleibt Anna zu Hause.',
                        '__Bei__ guter Vorbereitung besteht man die Prüfung leichter.',
                      ],
                      'wenn, als',
                      [
                        'Wenn es stark regnet, bleibt Anna zu Hause.',
                        'Wenn man sich gut vorbereitet, besteht man die Prüfung leichter.',
                      ],
                    ],
                    [
                      'nach + D',
                      [
                        '__Nach__ der Ankunft am Flughafen suchten sie ein Taxi.',
                        '__Nach__ dem Abschluss der Ausbildung begann er zu arbeiten.',
                      ],
                      'nachdem',
                      [
                        'Nachdem sie am Flughafen angekommen waren, suchten sie ein Taxi.',
                        'Nachdem er die Ausbildung abgeschlossen hatte, begann er zu arbeiten.',
                      ],
                    ],
                    [
                      'zu + D',
                      [
                        '__Zur__ Beruhigung der Kunden sandte die Firma eine E-Mail.',
                        '__Zum__ Erlernen der neuen Software nahm er an einem Kurs teil.',
                      ],
                      'damit / um + zu + Inf. (gleiches Sub.)',
                      [
                        'Damit sich die Kunden beruhigen, sandte die Firma eine E-Mail.',
                        'Um die neue Software zu erlernen, nahm er an einem Kurs teil.',
                      ],
                    ],
                  ],
                },
              ],
            },
          ],
        },
        {
          h: 'Письмо',
          sub: [
            {
              h: 'Памятка Beschreibung und Zusammenfassung einer Grafik',
              downloadUrl: 'https://drive.google.com/file/d/184h0z1KQq8jSPjDCiuhvCO-drMcdt32P/view?usp=sharing',
              content: [
                { type: 'p', text: 'Synonyme für „Grafik“: das Schaubild, das Diagramm, die Tabelle, die Statistik, die Daten (Pl.)' },
                { type: 'heading', text: 'A. Thema und Quelle' },
                { type: 'subheading', text: 'Das Thema der Grafik wiedergeben' },
                {
                  type: 'list',
                  items: [
                    'Die Grafik zeigt, … / Das Diagramm informiert über …',
                    'Thema des Balkendiagramms/Liniendiagramms/Tortendiagramms ist …',
                    'In dieser Grafik geht es um / darum, dass …',
                    'Die vorliegende Grafik beschäftigt sich mit …',
                    'Diese Grafik zeigt uns Daten und Fakten zum Thema X, und zwar ganz konkret zu/dazu, …',
                    'Die Angaben erfolgen in Prozent / in ganzen Zahlen / in …',
                  ],
                },
                { type: 'subheading', text: 'Die Quelle nennen' },
                {
                  type: 'list',
                  items: [
                    'Die Daten stammen aus der Zeitung …',
                    'Die Grafik stammt von … und ist aus dem Jahr …',
                    'Die Quelle der Grafik ist …',
                  ],
                },
                { type: 'heading', text: 'B. Beschreibung – Zusammenfassung' },
                { type: 'subheading', text: 'Reihenfolgen beschreiben' },
                {
                  type: 'list',
                  items: [
                    'Man kann feststellen, dass …',
                    'An erster / zweiter / vorletzter / letzter Stelle steht/stehen …',
                    'Auf dem ersten/zweiten Platz wird … genannt.',
                    'Die meisten / wenigsten der Befragten finden, …',
                    'Ein Großteil meint, …',
                    'Am wichtigsten / unwichtigsten ist den Befragten …',
                    'Rund die Hälfte ist überzeugt davon, dass …',
                    'Über die Hälfte der befragten Personen geben an, dass …',
                    'Beinahe ein Drittel der … / Zirka die Hälfte findet … / Ungefähr ein Viertel sagt …',
                    '… Prozent finden/sagen/meinen, dass …',
                    'Der Spitzenreiter ist …',
                    'Das Schlusslicht ist …',
                    'Im Mittelfeld liegt …',
                  ],
                },
                { type: 'subheading', text: 'Entwicklungen / Veränderungen / Tendenzen beschreiben' },
                {
                  type: 'list',
                  items: [
                    'Die allgemeine Tendenz zeigt/macht deutlich, dass …',
                    'Der Anteil/Die Zahl der … ist von … (im Jahre …) auf … (im Jahre …) gestiegen/angestiegen/angewachsen/gesunken/zurückgegangen.',
                    'Der Anteil der … ist um fast/mehr als … % gestiegen/gesunken.',
                    'Die Zahl der … hat sich zwischen … und … um … % erhöht/verringert.',
                    'Die Zahl der … hat zwischen … und … um … % zugenommen/abgenommen.',
                  ],
                },
                { type: 'subheading', text: 'Informationen miteinander vergleichen' },
                {
                  type: 'list',
                  items: [
                    'Im Vergleich zu … ist die Zahl der … um … % höher/niedriger.',
                    'Im Gegensatz/Im Unterschied zu … ist der Anteil der … um … % gefallen/gestiegen.',
                    'Verglichen mit … hat sich die Zahl um … % gesteigert/verringert.',
                    'Anders als bei/in … kann man bei/in … feststellen, dass …',
                    'Die Werte von … unterscheiden sich deutlich von …',
                    'Wenn man diese Daten mit … vergleicht, dann zeigt sich/sieht man, dass …',
                  ],
                },
                { type: 'heading', text: 'C. Auffälligkeiten und Interpretation der Daten' },
                { type: 'subheading', text: 'Auffälligkeiten beschreiben' },
                {
                  type: 'list',
                  items: [
                    'Auffällig/Interessant/Überraschend ist, dass …',
                    'Besonders bemerkenswert ist, dass …',
                    'Es fällt auf, dass … / Mir fällt auf, dass …',
                    'Überraschend ist die Tatsache, dass …',
                    'Ich hätte nicht erwartet, dass …',
                    'Erstaunlich finde ich, dass …',
                    'Es ist auffällig, dass …',
                    'Mich hat überrascht, dass …',
                  ],
                },
                { type: 'subheading', text: 'Informationen interpretieren/bewerten, Vermutungen äußern, Gründe nennen' },
                {
                  type: 'list',
                  items: [
                    'Ich vermute/nehme an, dass …',
                    'Wahrscheinlich/vermutlich/möglicherweise hängt … damit zusammen, dass …',
                    'Es könnte sein, dass … / Ein Grund dafür könnte sein, dass …',
                    'Ich könnte mir vorstellen, dass …',
                    'Für diese Tendenz sind … verantwortlich.',
                    'Diese Entwicklung ist auf … zurückzuführen.',
                    'Eine mögliche Ursache dafür ist, dass …',
                  ],
                },
              ],
            },
          ],
        },
        {
          h: 'Устная часть',
          sub: [
            {
              h: 'Памятка mündliche EPD (для всех типов)',
              downloadUrl: 'https://drive.google.com/file/d/1tUQiNRPtHxg_7lPlu27P3mxxED2w1Wg-/view?usp=sharing',
              content: [
                { type: 'heading', text: 'Bild beschreiben und interpretieren' },
                {
                  type: 'list',
                  items: [
                    'Auf diesem Bild sehe ich …',
                    'Im Zentrum/Mittelpunkt des Bildes ist …',
                    'Im Hintergrund/Vordergrund des Bildes gibt es …',
                    'Am rechten/linken/oberen/unteren Rand ist …',
                    'Links, rechts, oben, unten sieht man …',
                    'Insgesamt kann man feststellen, dass …',
                    'Ich vermute, dass es um das Thema … geht.',
                    'Hier könnte es sich um … handeln.',
                    'Möglicherweise soll das Bild zeigen, …',
                    'Man kann annehmen, dass …',
                  ],
                },
                { type: 'heading', text: 'Thema eines Zitats/einer Aussage in eigenen Worten wiedergeben' },
                {
                  type: 'list',
                  items: [
                    'Bei dieser Aussage geht es um / darum, dass … (gehen um + Akk)',
                    'Bei der vorliegenden Aussage geht es um die Frage, …',
                    'Die vorliegende Aussage beschäftigt sich mit dem Thema X, und dabei vor allem mit der Frage/mit dem Aspekt X.',
                    'Dieses Zitat bezieht sich auf das Thema X und wirft/greift die Frage auf, …',
                    'Die zitierte Aussage bezieht sich auf das Thema X.',
                    'Diese Aussage steht mit dem Thema X in Zusammenhang (in Zusammenhang stehen mit, zusammenhängen mit, passen zu, in Beziehung stehen mit) und verdeutlicht …',
                    'Die Aussage beschäftigt sich mit dem Problem / mit der Problematik / damit, dass …',
                    'Thematisch/Inhaltlich geht es bei dieser Aussage um … (gehen um + Akk)',
                    'Thematisch/Inhaltlich handelt diese Aussage von/davon, dass … (handeln von + Dativ)',
                    'Diese Aussage steht im Kontext der Frage, …',
                  ],
                },
                { type: 'heading', text: 'Zustimmung ausdrücken' },
                {
                  type: 'list',
                  items: [
                    'Ich stimme dieser Aussage (teilweise) zu, weil …',
                    'Ich finde, dass dieses Zitat zutrifft / genau richtig ist / stimmt.',
                    'Diese Aussage trifft meiner Meinung nach die Problematik X genau, denn …',
                    'Ich bin mit dem Inhalt dieser Aussage einverstanden, denn …',
                    'Ich bin mit dieser Meinung einverstanden.',
                    '… Der Meinung/Ansicht bin ich auch.',
                    'Es ist mit Sicherheit so, dass …',
                    'Ich schließe mich dieser Meinung an.',
                    'In Bezug / In Hinblick auf diese Aussage, möchte ich sagen, dass …',
                    'Ich finde dieses Zitat sehr zutreffend, weil …',
                    'Diese Aussage entspricht auch meiner persönlichen Meinung/Einschätzung.',
                    'Ich finde, X hat (damit) recht, dass …',
                    'Ich teile die Meinung von X voll und ganz.',
                    'Ich bin der gleichen Meinung wie X.',
                  ],
                },
                { type: 'heading', text: 'Widerspruch/Ablehnung ausdrücken' },
                {
                  type: 'list',
                  items: [
                    'Das stimmt meiner Meinung nach nicht.',
                    'Ich bin anderer Meinung als X.',
                    'Ich teile die Meinung von X überhaupt nicht.',
                    'Ich kann X/dieser Meinung (= Dativ) nicht zustimmen, da …',
                    'Dieser Meinung/Aussage muss ich (leider) widersprechen.',
                    'Damit bin ich ganz und gar nicht einverstanden.',
                    'Ich denke, diese Einstellung ist falsch, denn …',
                    'Ich sehe das (etwas) anders, denn …',
                    'Das halte ich für problematisch.',
                    'Es stimmt zwar, dass …, aber ich bin (trotzdem) der Meinung, dass …',
                    'Auf den ersten Blick …, aber wenn man genauer hinschaut, …',
                    'Ich finde diese Aussage nicht zutreffend, denn …',
                    'Diese Aussage widerspricht meiner persönlichen Einschätzung/Meinung/Auffassung.',
                  ],
                },
                { type: 'heading', text: 'Eigene Meinung ausdrücken' },
                {
                  type: 'list',
                  items: [
                    'Ich bin der Meinung/Auffassung/Ansicht, dass …',
                    'Ich vertrete die Meinung / die Ansicht / den Standpunkt, dass …',
                    'Meiner Meinung/Ansicht nach + Verb + Subjekt',
                    'Ich stehe auf dem Standpunkt, dass …',
                    'Meines Erachtens + Verb + Subjekt',
                    'Ich denke/meine/finde/glaube, dass …',
                    'Ich bin überzeugt davon, dass …',
                  ],
                },
                { type: 'heading', text: 'Unpersönliche Formulierungen zu einem Thema/einer Problematik' },
                {
                  type: 'list',
                  items: [
                    'Es ist klar/logisch, dass …',
                    'Es lässt sich sagen, dass …',
                    'Man muss feststellen, dass …',
                    'Es ist erwiesen, dass …',
                    'Studien belegen/zeigen, dass …',
                    'Experten betonen/unterstreichen, dass …',
                    'Man darf nicht vergessen, dass …',
                  ],
                },
                { type: 'heading', text: 'Die eigene Meinung mit sachlichen Argumenten begründen' },
                { type: 'subheading', text: 'Gründe nennen' },
                {
                  type: 'list',
                  items: [
                    'weil, da, denn, deswegen/deshalb/daher/darum/infolgedessen, nämlich (= Position 3)',
                    'Das kommt daher, dass …',
                    'Der Grund / die Ursache / das Motiv (dafür) ist, dass …',
                    'Einer der Gründe / eine der Ursachen / eines der Motive für … ist, dass …',
                    'Es gibt verschiedene Gründe dafür, warum …',
                    'wegen / aufgrund + Genitiv',
                  ],
                },
                { type: 'subheading', text: 'Vorteile/Nachteile benennen und aufzählen' },
                {
                  type: 'list',
                  items: [
                    'für/gegen X spricht, dass …',
                    'X spricht für/dafür — gegen/dagegen, dass …',
                    'Dafür/dagegen spricht, dass …',
                    '… . Das ist (für mich) ein Argument für/gegen X.',
                    '… . Das ist meiner Meinung nach ein klarer Vorteil/Nachteil — Pluspunkt/Minuspunkt.',
                    'X hat den Vorteil/Nachteil, dass …',
                    'Ich möchte zuerst einige Vorteile nennen/darlegen.',
                    'Ein großer Vorteil/Nachteil von X ist, dass …',
                    'Ein wichtiges Argument für/gegen … ist die Tatsache, dass …',
                    '… ist ein wichtiges Argument für/gegen + Akk.',
                    'Das Hauptargument dafür/dagegen ist, …',
                    '… ist ein zentrales Argument dafür, dass … / dagegen, dass …',
                    'Für/gegen diese Meinung spricht, dass …',
                    'Nun möchte ich noch ein paar Nachteile/Vorteile aufzählen/auflisten.',
                    'Für mich persönlich überwiegen eindeutig die Vorteile (die Nachteile).',
                  ],
                },
                { type: 'p', text: 'Мит Doppelkonjunktionen тоже можно называть разные аспекты (плюсы/минусы) — einerseits – andererseits, nicht nur – sondern auch, zwar – aber, teils – teils, weder – noch, sowohl – als auch, entweder – oder. Подробный разбор этих союзов — в памятке Doppelkonjunktionen в разделе «Грамматика».' },
                { type: 'subheading', text: 'Konsequenzen formulieren' },
                {
                  type: 'list',
                  items: [
                    'X führt dazu, dass …',
                    'X könnte zur Folge haben, dass …',
                    'X hätte zur Folge, dass …',
                    'X könnte den Effekt haben, dass …',
                    'X würde möglicherweise dazu führen, dass …',
                    'X würde bewirken, dass …',
                    'Das würde … hervorrufen.',
                    'Eine Folge/Konsequenz von X könnte sein, dass …',
                    'X würde mit sich bringen, dass …',
                    'Wenn man … machen würde, hätte dies zur Folge, dass …',
                    'Würde man … machen, würde das dazu führen, dass …',
                  ],
                },
                { type: 'subheading', text: 'Möglichkeiten/Maßnahmen vorschlagen' },
                {
                  type: 'list',
                  items: [
                    'Man sollte die folgenden Maßnahmen ergreifen/setzen, um / damit / weil …:',
                    'Meiner Meinung nach wären die folgenden Maßnahmen sinnvoll und zielführend:',
                    'Der Staat / die Politik / die Regierung / die Gesellschaft hätte folgende Möglichkeiten, um … :',
                    'Eine hilfreiche Maßnahme wäre es in meinen Augen, wenn …',
                    'Es wäre zielführend, wenn …',
                    'Um … zu erreichen / damit … erreicht werden kann, wäre es sinnvoll, wenn …',
                    'X würde dazu führen, dass …',
                    'Wenn man …, würde das dazu führen, dass …',
                    'Außerdem könnte man …, was (ebenfalls) den Effekt hätte, dass …',
                  ],
                },
                { type: 'heading', text: 'Grafik/Schaubild/Diagramm' },
                { type: 'subheading', text: 'Thema wiedergeben' },
                {
                  type: 'list',
                  items: [
                    'Die Grafik zeigt, … / Das Diagramm informiert über …',
                    'Thema des Balkendiagramms/Liniendiagramms/Tortendiagramms ist …',
                    'In dieser Grafik geht es um / darum, dass …',
                    'Die vorliegende Grafik beschäftigt sich mit …',
                    'Diese Grafik zeigt uns Daten und Fakten zum Thema X, und zwar ganz konkret zu/dazu, …',
                    'Die vorliegende Grafik besteht aus (z. B. zwei Balkendiagrammen, einem Tortendiagramm, einem Liniendiagramm) und liefert dem Betrachter konkrete Zahlen zu/zur Frage …',
                    'Die Angaben erfolgen in Prozent.',
                  ],
                },
                { type: 'subheading', text: 'Hauptinformationen beschreiben/zusammenfassen' },
                {
                  type: 'list',
                  items: [
                    'Es ist festzustellen, dass …',
                    'An erster / zweiter / vorletzter / letzter Stelle steht/stehen …',
                    'Auf dem ersten/zweiten Platz wird … genannt.',
                    'Die meisten / wenigsten der Befragten finden, …',
                    'Ein Großteil meint, …',
                    'Am wichtigsten / unwichtigsten ist den Befragten …',
                    'Rund die Hälfte ist überzeugt davon, dass …',
                    'Über die Hälfte der befragten Personen geben an, dass …',
                    'Beinahe ein Drittel der … / Zirka die Hälfte findet … / Ungefähr ein Viertel sagt …',
                    '… Prozent finden/sagen/meinen, dass …',
                  ],
                },
                { type: 'subheading', text: 'Entwicklungen/Veränderungen/Tendenzen der Zahlen beschreiben' },
                {
                  type: 'list',
                  items: [
                    'Es ist zu beobachten, dass …',
                    'Es zeigt sich, dass …',
                    'Die allgemeine Tendenz zeigt/macht deutlich, dass …',
                    'Der Anteil/Die Zahl der … ist von … (im Jahre …) auf … (im Jahre …) gestiegen/angestiegen/angewachsen/gesunken/zurückgegangen.',
                    'Der Anteil der … ist um fast/mehr als … % gestiegen/gesunken.',
                    'Die Zahl der … hat sich zwischen … und … um … % erhöht/verringert.',
                    'Die Zahl der … hat zwischen … und … um … % zugenommen/abgenommen.',
                  ],
                },
                { type: 'subheading', text: 'Informationen miteinander vergleichen' },
                {
                  type: 'list',
                  items: [
                    'Im Vergleich zu … ist die Zahl der … um … % höher/niedriger.',
                    'Im Gegensatz/Im Unterschied zu … ist der Anteil der … um … % gefallen/gestiegen.',
                    'Verglichen mit … hat sich die Zahl um … % gesteigert/verringert.',
                    'Anders als bei/in … kann man bei/in … feststellen, dass …',
                    'Die Werte von … unterscheiden sich deutlich von …',
                    'Wenn man diese Daten mit … vergleicht, dann zeigt sich/sieht man, dass …',
                  ],
                },
                { type: 'subheading', text: 'Überraschende Informationen' },
                {
                  type: 'list',
                  items: [
                    'Auffällig/Interessant/Überraschend ist, dass …',
                    'Besonders bemerkenswert ist, dass … / Es ist auffällig, dass …',
                    'Es fällt auf, dass … / Mir fällt auf, dass … / Mich hat überrascht, dass …',
                    'Überraschend ist die Tatsache, dass … / Erstaunlich finde ich, dass …',
                    'Ich hätte nicht erwartet, dass …',
                  ],
                }
              ],
            },
          ],
        },
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

    // Plain link shown at the very top of the "Об экзамене" tab (see
    // ExamPage.jsx) — not a tab of its own, unlike EPD's theory-tab
    // entry, since EPE has no "Теория" tab to put it in.
    topicsLink: 'https://drive.google.com/file/d/1zPt8P_ZE1HlU1WFwfOqp5I61Y3AiHpXP/view?usp=sharing',
  },

  chemie: {
    key: 'chemie',
    label: 'EPC',
    title: 'EPC — экзамен по химии',
    subtitle: 'Информация об экзамене — пробники скоро появятся.',
    color: 'var(--green)',
    colorDark: 'var(--green-dark)',
    className: 'green',
    homeTitle: 'Экзамен по химии',
    homeDesc: 'Информация об устном дополнительном экзамене по химии. Пробники скоро появятся.',
    // Hidden from nav/cards for everyone except admins for now — see
    // visibleExamList/visibleComingSoonSubjects below. The route/page
    // itself is untouched, so a direct link still works.
    adminOnly: true,
    hidePracticeTab: true,
    filters: [],
    about: [
      {
        h: 'Как проходит экзамен',
        content: [
          { type: 'p', text: 'Дополнительный вступительный экзамен (Ergänzungsprüfung) по химии — устный.' },
          {
            type: 'list',
            items: [
              'Время на подготовку: 20 минут.',
              'Продолжительность самого ответа: 10 минут.',
              'Экзамен состоит из 3 вопросов — каждый нужно раскрыть минимум на 50%.',
            ],
          },
        ],
      },
      {
        h: 'Темы вопросов',
        content: [
          { type: 'p', text: 'По одному вопросу из каждого из трёх разделов:' },
          {
            type: 'list',
            items: [
              'Общая и неорганическая химия — разделы 1 и 2.',
              'Термодинамика, равновесие, электрохимия, кислотно-основные реакции, стехиометрия — раздел 3, а также расчёты из разделов 1 и 2.',
              'Органическая химия — раздел 4.',
            ],
          },
          {
            type: 'note',
            text: 'Базовые навыки — работа с периодической системой элементов, уравнения реакций, термины, применение формул и т. д. — обязательны и пригодятся на экзамене.',
          },
        ],
      },
      {
        h: 'Как проверяются ответы',
        content: [
          {
            type: 'note',
            text: 'На экзамене важно объяснять ход решения понятно и последовательно — рассказывайте пошагово, как вы пришли к ответу на каждый вопрос.',
          },
        ],
      },
      {
        h: 'Что можно использовать на экзамене',
        content: [
          {
            type: 'list',
            items: [
              'Калькулятор — непрограммируемый, взять с собой самостоятельно!',
              'Периодическая система элементов, сборник формул и таблицы — выдаются на самом экзамене.',
            ],
          },
        ],
      },
    ],
    usefulMaterials: {
      h: 'Полезные материалы и ссылки',
      content: [
        {
          type: 'list',
          items: [
            { lead: 'Сборник формул для EP Chemistry', text: '', url: 'https://www.vwu-info.at/chemie/Formelsammlung.pdf' },
            { lead: 'Список ключевых слов для EP Chemistry', text: '', url: 'https://www.vwu-info.at/chemie/Stichwortliste.pdf' },
          ],
        },
        { type: 'heading', text: 'Подборка таблиц по химии EP' },
        {
          type: 'list',
          items: [
            { lead: 'Электрохимический ряд', text: '', url: 'https://www.vwu-info.at/chemie/Elektrochemische%20Spannungsreihe.pdf' },
            { lead: 'Константы диссоциации слабых кислот', text: '', url: 'https://www.vwu-info.at/chemie/S%C3%A4urekonstanten%20schwacher%20S%C3%A4uren.pdf' },
            { lead: 'Термодинамические данные', text: '', url: 'https://www.vwu-info.at/chemie/Thermodynamische%20Daten.pdf' },
          ],
        },
      ],
    },
  },

  physik: {
    key: 'physik',
    label: 'EPP',
    title: 'EPP — экзамен по физике',
    subtitle: 'Информация об экзамене — пробники скоро появятся.',
    color: 'var(--amber)',
    colorDark: 'var(--amber-dark)',
    className: 'orange',
    homeTitle: 'Экзамен по физике',
    homeDesc: 'Информация об устном дополнительном экзамене по физике. Пробники скоро появятся.',
    adminOnly: true,
    hidePracticeTab: true,
    filters: [],
    about: [
      {
        h: 'Как проходит экзамен',
        content: [
          {
            type: 'p',
            text: 'Дополнительный вступительный экзамен (Ergänzungsprüfung) по физике — устный, охватывает материал сразу обоих семестров курса (отдельного экзамена после первого семестра нет).',
          },
          {
            type: 'list',
            items: [
              'Продолжительность: около 10–15 минут.',
              'Время на подготовку: около 15–20 минут.',
              'Принимает комиссия из трёх человек: руководитель курса, ещё один преподаватель VWU и председатель — университетский профессор.',
              'Каждый вопрос нужно раскрыть минимум на 50%.',
              'Экзамен не зависит от посещения курса — материал можно выучить самостоятельно и сдавать в любую из дат.',
              'Даты экзамена — несколько раз в год: конец сентября, конец октября, конец января, конец марта, конец апреля, конец июня.',
            ],
          },
          {
            type: 'note',
            text: 'Пересдать экзамен можно 4 раза (всего 5 попыток). Если и последняя попытка неудачна — обучение по этой специальности прекращается.',
          },
        ],
      },
      {
        h: 'Программа курса',
        content: [
          {
            type: 'p',
            text: 'Курс длится два семестра по 5 часов в неделю (плюс 1 час упражнений); каждый семестр разделён на три раздела.',
          },
          { type: 'subheading', text: 'Первый семестр (Physik 1)' },
          {
            type: 'list',
            items: [
              'Раздел 1 — элементарная механика: физические величины и единицы измерения, простые виды движения, сила, энергия, импульс, мощность, трение, двумерные векторы.',
              'Раздел 2 — учение о тепле: гидростатическое давление, выталкивающая сила, тепловая энергия и теплоёмкость, идеальные газы, первое начало термодинамики, агрегатные состояния.',
              'Раздел 3 — продвинутая механика: вращательное движение, закон гравитации, упругость, колебания и волны, звук, поверхностное натяжение, течение жидкостей.',
            ],
          },
          { type: 'subheading', text: 'Второй семестр (Physik 2)' },
          {
            type: 'list',
            items: [
              'Раздел 4 — электростатика: электрический заряд, закон Кулона, электрическое поле и напряжение, электроёмкость, электрический ток и сопротивление, цепи постоянного тока.',
              'Раздел 5 — магнетизм и электродинамика: магнитное поле, сила Лоренца, электродвигатель, катушка, закон индукции, генератор, переменный ток, трансформатор.',
              'Раздел 6 — электромагнитное излучение: колебательный контур, электромагнитный спектр, отражение, преломление, дифракция, поляризация, геометрическая оптика, рентгеновская трубка, фотоэффект.',
            ],
          },
        ],
      },
      {
        h: 'Система бонусов',
        content: [
          {
            type: 'p',
            text: 'Бонусная система доступна только тем, кто записан на курс физики в VWU. Всего можно получить 4 бонусных зачёта — по одному за разделы 1, 2, 4 и 5 (для разделов 3 и 6 бонус получить нельзя).',
          },
          {
            type: 'list',
            items: [
              'Зачёт можно получить регулярным посещением занятий-упражнений по соответствующему разделу, либо успешной сдачей бонусного теста по этому разделу.',
            ],
          },
          {
            type: 'note',
            text: 'Бонусные зачёты не влияют на итоговую оценку экзамена — только на объём материала, который будут спрашивать.',
          },
          {
            type: 'list',
            items: [
              'Полный бонус (Vollbonus) — 4 зачёта: по одному вопросу из раздела 3 и раздела 6 (всего 2 вопроса).',
              'Бонус + допвопрос — 3 зачёта: по одному вопросу из раздела без зачёта, раздела 3 и раздела 6 (всего 3 вопроса).',
              'Без бонуса — 2 зачёта или меньше: весь материал курса (всего 3 вопроса).',
            ],
          },
        ],
      },
      {
        h: 'Что можно использовать на экзамене',
        content: [
          {
            type: 'note',
            text: 'Разрешённый сборник формул можно использовать не только на самом экзамене, но и на занятиях-упражнениях и бонусных тестах.',
          },
        ],
      },
    ],
    usefulMaterials: {
      h: 'Полезные материалы и ссылки',
      content: [
        {
          type: 'list',
          items: [
            { lead: 'Информационный листок', text: '— программа курса, экзамен, бонусная система', url: 'https://www.vwu-info.at/physik/infoblatt-allgemein.pdf' },
            { lead: 'Сборник формул', text: '— разрешён на экзамене, занятиях и бонусных тестах', url: 'https://www.vwu-info.at/physik/formelsammlung-2025.pdf' },
          ],
        },
        { type: 'heading', text: 'Скрипт по разделам' },
        {
          type: 'list',
          items: [
            { lead: 'Раздел 1 — элементарная механика', text: '', url: 'https://www.vwu-info.at/physik/skriptum/neu/skript-teil1.pdf' },
            { lead: 'Раздел 2 — учение о тепле', text: '', url: 'https://www.vwu-info.at/physik/skriptum/neu/skript-teil2.pdf' },
            { lead: 'Раздел 3 — продвинутая механика', text: '', url: 'https://www.vwu-info.at/physik/skriptum/neu/skript-teil3.pdf' },
            { lead: 'Раздел 4 — электростатика', text: '', url: 'https://www.vwu-info.at/physik/skriptum/neu/skript-teil4.pdf' },
            { lead: 'Раздел 5 — электродинамика и магнетизм', text: '', url: 'https://www.vwu-info.at/physik/skriptum/neu/skript-teil5.pdf' },
            { lead: 'Раздел 6 — электромагнитное излучение, оптика', text: '', url: 'https://www.vwu-info.at/physik/skriptum/neu/skript-teil6.pdf' },
          ],
        },
        { type: 'heading', text: 'Дополнительные материалы' },
        {
          type: 'list',
          items: [
            { lead: 'Правило правой руки', text: '— для разделов 4 и 5', url: 'https://www.vwu-info.at/physik/zusatzmaterial/rechte-hand-regel.pdf' },
            { lead: 'Физические единицы', text: '', url: 'https://www.vwu-info.at/physik/zusatzmaterial/wichtige-einheiten.pdf' },
          ],
        },
        { type: 'heading', text: 'Подборки задач для подготовки (категория «Полный бонус»)' },
        {
          type: 'list',
          items: [
            { lead: 'Задачи по разделу 3', text: '', url: 'https://www.vwu-info.at/physik/wh-aufgaben/aufgabensammlung-abschnitt3-dez2021.pdf' },
            { lead: 'Задачи по разделу 6', text: '', url: 'https://www.vwu-info.at/physik/wh-aufgaben/aufgabensammlung-abschnitt6-dez2021.pdf' },
          ],
        },
      ],
    },
  },
}

// Display order for nav dropdowns, the footer, and the home page cards —
// deliberately not just Object.values(exams) (insertion order), so this
// can be changed without reshuffling the exam definitions above.
export const examList = ['epd', 'epm', 'epe', 'chemie', 'physik'].map((key) => exams[key])

// ---------------------------------------------------------------------
// Subjects the project doesn't have real content for yet (no probniks,
// no task bank) — each just gets a lightweight "coming soon" page (see
// ComingSoonSubject.jsx) instead of the full exam machinery above.
// `materialsUrl` is a placeholder — replace it with a real link (a
// shared folder, a doc, whatever) once materials exist to point to.
// ---------------------------------------------------------------------
export const comingSoonSubjects = [
  {
    key: 'geschichte',
    label: 'Geschichte',
    title: 'Geschichte — история',
    color: 'var(--red, #d0453f)',
    className: 'red',
    homeTitle: 'История (Geschichte)',
    homeDesc: 'Раздел в разработке — пробников пока нет, но материалы для подготовки уже можно найти по ссылке.',
    materialsUrl: '#',
    adminOnly: true,
  },
  {
    key: 'biologie',
    label: 'Biologie',
    title: 'Biologie — биология',
    color: 'var(--orange, #e08a2c)',
    className: 'orange',
    homeTitle: 'Биология (Biologie)',
    homeDesc: 'Раздел в разработке — пробников пока нет, но материалы для подготовки уже можно найти по ссылке.',
    materialsUrl: '#',
    adminOnly: true,
  },
]

// Filters examList/comingSoonSubjects down to what a visitor is allowed
// to see in nav/cards right now — items flagged `adminOnly` (EPC/EPP/
// Biologie/Geschichte, currently) stay visible to admins only, while
// everyone else just doesn't see the entry (the page itself is still
// reachable by direct link — this only hides it from navigation).
export function visibleExamList(isAdmin) {
  return isAdmin ? examList : examList.filter((e) => !e.adminOnly)
}

export function visibleComingSoonSubjects(isAdmin) {
  return isAdmin ? comingSoonSubjects : comingSoonSubjects.filter((s) => !s.adminOnly)
}
