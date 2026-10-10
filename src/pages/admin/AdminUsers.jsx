import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listAllProfiles, setAdminPro, INDEFINITE_PRO_UNTIL } from '../../services/profilesService.js'
import { PRO_EMAILS } from '../../contexts/AuthContext.jsx'
import { useDialog } from '../../contexts/DialogContext.jsx'
import PageLoader from '../../components/PageLoader.jsx'

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

// Та же логика, что isPro в AuthContext.jsx, но по произвольной строке
// profiles (а не по текущему залогиненному юзеру) — для отрисовки
// статуса каждого пользователя в таблице.
function proInfo(row) {
  const now = new Date()
  const isEmailPro = !!row.email && PRO_EMAILS.includes(row.email)
  const trialUntil = row.trialProUntil ? new Date(row.trialProUntil) : null
  const trialActive = !!trialUntil && trialUntil > now
  const adminUntil = row.adminProUntil ? new Date(row.adminProUntil) : null
  const adminActive = !!adminUntil && adminUntil > now
  return { isEmailPro, trialActive, trialUsed: !!trialUntil, adminActive }
}

export default function AdminUsers() {
  const [profiles, setProfiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)
  const { confirm, alertMessage } = useDialog()

  function reload() {
    setLoading(true)
    listAllProfiles().then((list) => {
      setProfiles(list)
      setLoading(false)
    })
  }

  useEffect(reload, [])

  async function handleToggle(row, grant) {
    if (!grant) {
      const ok = await confirm(`Забрать PRO у ${row.email}?`)
      if (!ok) return
    }
    setBusyId(row.id)
    try {
      await setAdminPro(row.id, grant)
      setProfiles((prev) =>
        prev.map((p) => (p.id === row.id ? { ...p, adminProUntil: grant ? INDEFINITE_PRO_UNTIL : null } : p))
      )
    } catch (err) {
      await alertMessage(err.message || 'Не удалось изменить PRO-статус.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="admin-page">
      <div className="admin-header">
        <div>
          <h1>Пользователи</h1>
          <p>Все зарегистрированные аккаунты — можно вручную выдать или забрать PRO.</p>
        </div>
        <Link className="btn btn-outline" to="/admin">← В админку</Link>
      </div>

      {loading ? (
        <PageLoader />
      ) : profiles.length === 0 ? (
        <p className="admin-note">Пока никто не зарегистрировался.</p>
      ) : (
        <div className="topic-progress-table-scroll">
          <table className="topic-progress-table admin-users-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Роль</th>
                <th>Регистрация</th>
                <th>PRO</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {profiles.map((row) => {
                const info = proInfo(row)
                return (
                  <tr key={row.id}>
                    <td>{row.email}</td>
                    <td>{row.role === 'admin' ? <span className="admin-pill">Админ</span> : 'Студент'}</td>
                    <td>{formatDate(row.createdAt)}</td>
                    <td>
                      {info.isEmailPro ? (
                        <span className="admin-pill pro">PRO · аккаунт разработчика</span>
                      ) : info.adminActive ? (
                        <span className="admin-pill pro">PRO · выдан вручную</span>
                      ) : info.trialActive ? (
                        <span className="admin-pill pro">PRO · пробный</span>
                      ) : (
                        <span className="admin-pill">Basic{info.trialUsed ? ' · пробный использован' : ''}</span>
                      )}
                    </td>
                    <td>
                      {!info.isEmailPro &&
                        (info.adminActive ? (
                          <button
                            type="button"
                            className="btn btn-outline"
                            disabled={busyId === row.id}
                            onClick={() => handleToggle(row, false)}
                          >
                            Забрать PRO
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="btn btn-primary"
                            disabled={busyId === row.id}
                            onClick={() => handleToggle(row, true)}
                          >
                            Выдать PRO
                          </button>
                        ))}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
