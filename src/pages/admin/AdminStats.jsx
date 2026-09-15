import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getVisitStats, getMostAttemptedTests } from '../../services/statsService.js'
import { isExcludedFromStats, excludeThisDeviceFromStats, includeThisDeviceInStats } from '../../lib/visits.js'
import PageLoader from '../../components/PageLoader.jsx'

function formatDay(dayStr) {
  const d = new Date(dayStr + 'T00:00:00')
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', weekday: 'short' })
}

export default function AdminStats() {
  const [stats, setStats] = useState(null)
  const [topTests, setTopTests] = useState([])
  const [loading, setLoading] = useState(true)
  const [excluded, setExcluded] = useState(() => isExcludedFromStats())

  useEffect(() => {
    setLoading(true)
    Promise.all([getVisitStats(14), getMostAttemptedTests(10)]).then(([s, t]) => {
      setStats(s)
      setTopTests(t)
      setLoading(false)
    })
  }, [])

  function toggleExcluded() {
    if (excluded) {
      includeThisDeviceInStats()
      setExcluded(false)
    } else {
      excludeThisDeviceFromStats()
      setExcluded(true)
    }
  }

  return (
    <div className="admin-page">
      <div className="admin-header">
        <div>
          <h1>Статистика посещений</h1>
          <p>Собственная статистика — только эта база данных, никаких сторонних сервисов.</p>
        </div>
        <Link className="btn btn-outline" to="/admin">← В админку</Link>
      </div>

      <div className="admin-stats-exclude-row">
        <button type="button" className={excluded ? 'btn btn-primary' : 'btn btn-outline'} onClick={toggleExcluded}>
          {excluded ? '✓ Мои визиты не учитываются на этом устройстве' : 'Не учитывать мои визиты на этом устройстве'}
        </button>
        <p className="admin-note">
          Действует только для этого браузера/устройства — если тестируете ещё и с телефона или другого браузера,
          нажмите там тоже. Уже записанные до этого визиты (пока вы разрабатывали платформу) остаются в базе —
          если хотите очистить всю накопленную статистику и начать заново, можно просто удалить все строки из
          таблицы <code>page_views</code> в Supabase (Table Editor → page_views → выделить всё → Delete rows).
        </p>
      </div>

      {loading ? (
        <PageLoader />
      ) : !stats ? (
        <p className="admin-note">
          Не удалось загрузить статистику — возможно, таблица <code>page_views</code> ещё не создана (нужно
          применить <code>supabase/page_views.sql</code>), либо у вашего аккаунта нет прав администратора.
        </p>
      ) : (
        <>
          <div className="admin-stats-cards">
            <div className="admin-stats-card">
              <div className="admin-stats-card-value">{stats.today.uniqueVisitors}</div>
              <div className="admin-stats-card-label">Посетителей сегодня</div>
              <div className="admin-stats-card-sub">из них {stats.today.loggedInVisitors} залогинены</div>
            </div>
            <div className="admin-stats-card">
              <div className="admin-stats-card-value">{stats.totals.uniqueVisitors}</div>
              <div className="admin-stats-card-label">Уникальных посетителей за 14 дней</div>
              <div className="admin-stats-card-sub">из них {stats.totals.loggedInVisitors} хотя бы раз заходили залогиненными</div>
            </div>
          </div>

          <section className="widget-card wide" style={{ marginBottom: 24 }}>
            <h2>Посетители по дням</h2>
            <div className="topic-progress-table-scroll">
              <table className="topic-progress-table">
                <thead>
                  <tr>
                    <th>День</th>
                    <th>Посетителей</th>
                    <th>Из них залогинены</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.daily.map((d) => (
                    <tr key={d.day}>
                      <td>{formatDay(d.day)}</td>
                      <td>{d.uniqueVisitors}</td>
                      <td>{d.loggedInVisitors}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <div className="mylearning-grid">
            <section className="widget-card">
              <h2>Самые популярные пробники</h2>
              {topTests.length === 0 ? (
                <p className="admin-note">Пока никто не проходил пробники.</p>
              ) : (
                <ol className="admin-stats-ranked-list">
                  {topTests.map((t) => (
                    <li key={t.testId}>
                      <span>{t.testTitle}</span>
                      <span className="admin-stats-ranked-count">{t.count}</span>
                    </li>
                  ))}
                </ol>
              )}
            </section>

            <section className="widget-card">
              <h2>Самые посещаемые страницы</h2>
              {stats.topPaths.length === 0 ? (
                <p className="admin-note">Пока нет данных.</p>
              ) : (
                <ol className="admin-stats-ranked-list">
                  {stats.topPaths.map((p) => (
                    <li key={p.path}>
                      <span>{p.path}</span>
                      <span className="admin-stats-ranked-count">{p.visitors}</span>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  )
}
