// supabase/functions/generate-practice-test/index.ts
//
// Pro-фича: собирает временный «пробник» из банка заданий,
// отфильтрованный по теме и/или типу задания, чтобы можно было
// тренировать что-то конкретное, а не решать весь пробник целиком.
// Вызывается с фронтенда как:
//   POST /functions/v1/generate-practice-test
//   { examKey: 'epd'|'epm'|'epe', topicId?: string, taskType?: string }
//   Authorization: Bearer <user JWT>
//
// Создание тестов (tests/test_tasks) по RLS разрешено только админам —
// обычный pro-пользователь не смог бы вставить эти строки напрямую с
// клиента. Поэтому это Edge Function с сервисным ключом, а не прямой
// insert с фронтенда, даже пока pro есть только у одного человека:
// когда/если появятся другие pro-пользователи, не админы, ничего
// переделывать не придётся.
//
// Доступ ограничен списком почт — тем же самым, что и в
// src/contexts/AuthContext.jsx (PRO_EMAILS). Не доверяем клиенту
// утверждение "я pro" — проверяем здесь тоже, по email из JWT.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// Держим в синхроне со списком в src/contexts/AuthContext.jsx.
const PRO_EMAILS = ['maksimmissuragin@gmail.com']

// Не даём собрать тренировку из тысячи заданий за один присест —
// достаточно ощутимой порции, чтобы был смысл, но не перегружало.
const MAX_QUESTIONS = 20

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return jsonResponse({ error: 'Не авторизован.' }, 401)

    let body: { examKey?: string; topicId?: string; taskType?: string }
    try {
      body = await req.json()
    } catch {
      return jsonResponse({ error: 'Некорректный запрос.' }, 400)
    }
    const examKey = body.examKey
    const topicId = body.topicId || null
    const taskType = body.taskType || null
    if (!examKey || !['epm', 'epd', 'epe'].includes(examKey)) {
      return jsonResponse({ error: 'Некорректный examKey.' }, 400)
    }
    if (!topicId && !taskType) {
      return jsonResponse({ error: 'Выберите тему и/или тип задания.' }, 400)
    }

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    })
    const {
      data: { user },
      error: userErr,
    } = await userClient.auth.getUser()
    if (userErr || !user) return jsonResponse({ error: 'Не авторизован.' }, 401)
    if (!user.email || !PRO_EMAILS.includes(user.email)) {
      return jsonResponse({ error: 'Эта функция доступна только в pro-версии.' }, 403)
    }

    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    let questionIds: string[] | null = null
    if (topicId) {
      const { data: taskTopicRows, error: ttErr } = await adminClient
        .from('task_topics')
        .select('task_id')
        .eq('topic_id', topicId)
      if (ttErr) return jsonResponse({ error: 'Не удалось найти задания по теме.', debug: ttErr.message }, 500)
      const ids: string[] = (taskTopicRows || []).map((r: { task_id: string }) => r.task_id)
      if (ids.length === 0) {
        return jsonResponse({ error: 'По этой теме пока нет заданий в банке.' }, 404)
      }
      questionIds = ids
    }

    let query = adminClient
      .from('questions')
      .select('id, position')
      .eq('test_id', `${examKey}-task-bank`)
    if (taskType) query = query.eq('task_type', taskType)
    if (questionIds) query = query.in('id', questionIds)
    const { data: questionRows, error: qErr } = await query.order('position')
    if (qErr) return jsonResponse({ error: 'Не удалось собрать задания.', debug: qErr.message }, 500)
    if (!questionRows || questionRows.length === 0) {
      return jsonResponse({ error: 'По этому сочетанию фильтров заданий не нашлось.' }, 404)
    }

    // Перемешиваем и обрезаем — иначе тренировка каждый раз была бы
    // одной и той же первой пачкой заданий банка.
    const shuffled = [...questionRows].sort(() => Math.random() - 0.5).slice(0, MAX_QUESTIONS)

    const topicLabel = topicId
      ? (await adminClient.from('topics').select('label').eq('exam_key', examKey).eq('id', topicId).single()).data?.label
      : null
    const titleParts = [topicLabel, taskType].filter(Boolean)
    const title = `Тренировка: ${titleParts.join(' — ')}`

    const testId = `practice-${examKey}-${crypto.randomUUID().slice(0, 8)}`
    const { error: insertTestErr } = await adminClient.from('tests').insert({
      id: testId,
      exam_key: examKey,
      title,
      short_description: 'Сгенерированная тренировка (pro) — не сохраняется в списке пробников.',
      is_official: false,
      is_pinned: false,
      format: 'written',
      year: new Date().getFullYear(),
      duration_minutes: Math.max(10, shuffled.length * 3),
    })
    if (insertTestErr) return jsonResponse({ error: 'Не удалось создать тренировку.', debug: insertTestErr.message }, 500)

    const testTasksRows = shuffled.map((q, i) => ({ test_id: testId, task_id: q.id, position: i + 1 }))
    const { error: insertTasksErr } = await adminClient.from('test_tasks').insert(testTasksRows)
    if (insertTasksErr) return jsonResponse({ error: 'Не удалось привязать задания.', debug: insertTasksErr.message }, 500)

    return jsonResponse({ testId, examKey, title, questionCount: shuffled.length })
  } catch (err) {
    console.error('generate-practice-test unhandled error:', err)
    return jsonResponse({ error: 'Внутренняя ошибка сервера.' }, 500)
  }
})
