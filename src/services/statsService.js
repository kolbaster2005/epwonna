import { supabase } from '../lib/supabaseClient.js'

function toError(err) {
  return err instanceof Error ? err : new Error(err?.message || 'Не удалось загрузить статистику.')
}

// Собственная статистика посещений — только для админки (RLS отдаёт
// строки page_views только is_admin() пользователям, см.
// supabase/page_views.sql). Считаем на клиенте из сырых строк, а не
// через SQL-агрегацию на сервере — при текущем объёме (сотни-тысячи
// строк в день на маленькой платформе) это быстрее написать и
// достаточно быстро работает; если объём вырастет на порядки, имеет
// смысл переписать на RPC-функцию с group by прямо в Postgres.
export async function getVisitStats(days = 14) {
  try {
    const since = new Date()
    since.setDate(since.getDate() - days)
    since.setHours(0, 0, 0, 0)

    const { data, error } = await supabase
      .from('page_views')
      .select('visitor_id, user_id, path, created_at')
      .gte('created_at', since.toISOString())
      .order('created_at', { ascending: true })
    if (error) throw error

    const rows = data || []

    // По страницам: path -> Set уникальных посетителей (не сырое число
    // переходов — если один человек пять раз обновил страницу, это
    // всё ещё один человек, интересующийся этой страницей, а не пять).
    const byDay = new Map()
    const allVisitors = new Set()
    const allLoggedInVisitors = new Set()
    const pathVisitors = new Map()

    for (const row of rows) {
      const day = row.created_at.slice(0, 10) // YYYY-MM-DD
      if (!byDay.has(day)) byDay.set(day, { visitors: new Set(), loggedInVisitors: new Set(), views: 0 })
      const bucket = byDay.get(day)
      bucket.views += 1
      bucket.visitors.add(row.visitor_id)
      allVisitors.add(row.visitor_id)
      if (row.user_id) {
        bucket.loggedInVisitors.add(row.visitor_id)
        allLoggedInVisitors.add(row.visitor_id)
      }
      if (!pathVisitors.has(row.path)) pathVisitors.set(row.path, new Set())
      pathVisitors.get(row.path).add(row.visitor_id)
    }

    const daily = [...byDay.entries()]
      .map(([day, b]) => ({
        day,
        views: b.views,
        uniqueVisitors: b.visitors.size,
        loggedInVisitors: b.loggedInVisitors.size,
      }))
      .sort((a, b) => (a.day < b.day ? 1 : -1)) // самые свежие сверху

    const topPaths = [...pathVisitors.entries()]
      .map(([path, visitors]) => ({ path, visitors: visitors.size }))
      .sort((a, b) => b.visitors - a.visitors)
      .slice(0, 10)

    const todayKey = new Date().toISOString().slice(0, 10)
    const todayBucket = byDay.get(todayKey)

    return {
      daily,
      topPaths,
      totals: {
        uniqueVisitors: allVisitors.size,
        loggedInVisitors: allLoggedInVisitors.size,
      },
      today: {
        views: todayBucket?.views ?? 0,
        uniqueVisitors: todayBucket?.visitors.size ?? 0,
        loggedInVisitors: todayBucket?.loggedInVisitors.size ?? 0,
      },
    }
  } catch (err) {
    console.error('[statsService.getVisitStats]', toError(err))
    return null
  }
}

// Самые часто проходимые пробники — из уже существующих test_attempts,
// никакой новой инфраструктуры для этого не нужно. Только завершённые —
// незавершённые черновики (completed_at is null, см. attemptsService)
// не считаются "прохождением".
export async function getMostAttemptedTests(limit = 10) {
  try {
    const { data, error } = await supabase
      .from('test_attempts')
      .select('test_id, test_title, exam_key')
      .not('completed_at', 'is', null)
    if (error) throw error
    const counts = new Map()
    for (const row of data || []) {
      const key = row.test_id
      if (!counts.has(key)) counts.set(key, { testId: row.test_id, testTitle: row.test_title, examKey: row.exam_key, count: 0 })
      counts.get(key).count += 1
    }
    return [...counts.values()].sort((a, b) => b.count - a.count).slice(0, limit)
  } catch (err) {
    console.error('[statsService.getMostAttemptedTests]', toError(err))
    return []
  }
}
