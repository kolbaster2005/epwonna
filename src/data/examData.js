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

    // "Теория" tab (see ExamPage.jsx: rendered whenever exam.theory is
    // set, same as topicsList/usefulMaterials below). Empty for now on
    // purpose — links get added here later; the tab itself should exist
    // in the meantime.
    theory: {
      h: 'Теория',
      sub: [
        {
          h: 'Письменная часть',
          sub: [
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
                      'nicht nur … sondern auch (не только …, но и)',
                      [
                        '__Nicht nur__ die Arbeitsbedingungen, __sondern auch__ das Gehalt spielen bei der Berufswahl eine wichtige Rolle.',
                        'Перевод: Не только условия труда, но и зарплата играют важную роль при выборе профессии.',
                      ],
                      '',
                    ],
                    [
                      'entweder … oder (либо … либо / или … или)',
                      [
                        '__Entweder__ wir fahren mit dem Zug, __oder__ wir mieten ein Auto.',
                        'Перевод: Либо мы поедем на поезде, либо возьмём машину напрокат.',
                      ],
                      '',
                    ],
                    [
                      'sowohl … als (auch) (как … так и)',
                      [
                        '__Sowohl__ die Mitarbeiter __als auch__ die Kunden waren mit der neuen Regelung unzufrieden.',
                        'Перевод: И сотрудники, и клиенты были недовольны новым правилом.',
                      ],
                      '',
                    ],
                    [
                      'weder … noch (ни … ни)',
                      [
                        '__Weder__ die hohen Kosten __noch__ der lange Anfahrtsweg konnten ihn davon abhalten, die Stelle anzunehmen.',
                        'Перевод: Ни высокие расходы, ни долгое время в пути не смогли помешать ему принять эту должность.',
                      ],
                      'Важно: дополнительное nicht обычно НЕ требуется: Ich trinke weder Kaffee noch Tee.',
                    ],
                    [
                      'je …, desto / umso (чем …, тем …)',
                      [
                        '__Je__ mehr man sich mit einem Thema beschäftigt, __desto__ besser versteht man die Zusammenhänge.',
                        'Перевод: Чем больше человек занимается какой-либо темой, тем лучше он понимает взаимосвязи.',
                      ],
                      'Порядок слов: после je — придаточное предложение, глагол в конце. После desto/umso — инверсия: desto + сравнительная степень + Verb + Subjekt.',
                    ],
                    [
                      'zwar … aber (хотя …, но)',
                      [
                        '__Zwar__ ist die Wohnung ziemlich teuer, __aber__ sie liegt direkt im Stadtzentrum.',
                        'Перевод: Квартира действительно довольно дорогая, но она находится прямо в центре города.',
                      ],
                      '',
                    ],
                    [
                      'einerseits … andererseits (с одной стороны … с другой стороны)',
                      [
                        '__Einerseits__ bietet das Homeoffice mehr Flexibilität, __andererseits__ kann die Trennung zwischen Berufs- und Privatleben schwieriger werden.',
                        'Перевод: С одной стороны, работа из дома предоставляет больше гибкости, с другой стороны, разделение между профессиональной и личной жизнью может стать сложнее.',
                      ],
                      'Порядок слов: при начале с einerseits/andererseits — инверсия: Einerseits bietet … / Andererseits kann …',
                    ],
                    [
                      'teils … teils (отчасти … отчасти / частично … частично)',
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
          ],
        },
        {
          h: 'Устная часть',
          content: [{ type: 'p', text: 'Здесь скоро появятся материалы по устной части.' }],
        },
      ],
    },

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
  },
  {
    key: 'physik',
    label: 'Physik',
    title: 'Physik — физика',
    color: 'var(--blue)',
    className: 'blue',
    homeTitle: 'Физика (Physik)',
    homeDesc: 'Раздел в разработке — пробников пока нет, но материалы для подготовки уже можно найти по ссылке.',
    materialsUrl: '#',
  },
  {
    key: 'chemie',
    label: 'Chemie',
    title: 'Chemie — химия',
    color: 'var(--green)',
    className: 'green',
    homeTitle: 'Химия (Chemie)',
    homeDesc: 'Раздел в разработке — пробников пока нет, но материалы для подготовки уже можно найти по ссылке.',
    materialsUrl: '#',
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
  },
]
