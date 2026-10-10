import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useAuth } from './AuthContext.jsx'

// Персонализация (страница /personalization) — какие курсы пользователь
// скрыл; скрытый курс не показывается ни в левом меню (ProSidebar), ни
// на pro-главной (ProDashboard), ни в подвале (Footer). Хранится в
// localStorage отдельно для каждого аккаунта — в БД пока не пишем, так
// что на другом устройстве выбор нужно сделать заново.
const PersonalizationContext = createContext(null)

const DEFAULT_PREFS = { hiddenExams: [] }

function storageKey(userId) {
  return `personalization:${userId}`
}

function readPrefs(userId) {
  if (!userId) return DEFAULT_PREFS
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey(userId)) || '{}')
    return {
      hiddenExams: Array.isArray(parsed.hiddenExams) ? parsed.hiddenExams : [],
    }
  } catch {
    return DEFAULT_PREFS
  }
}

export function PersonalizationProvider({ children }) {
  const { user } = useAuth()
  const userId = user?.id ?? null
  const [prefs, setPrefs] = useState(() => readPrefs(userId))

  // Сменился аккаунт (вход/выход) — подтягиваем его собственный выбор.
  useEffect(() => {
    setPrefs(readPrefs(userId))
  }, [userId])

  const updatePrefs = useCallback(
    (patch) => {
      setPrefs((prev) => {
        const next = { ...prev, ...patch(prev) }
        if (userId) {
          try {
            localStorage.setItem(storageKey(userId), JSON.stringify(next))
          } catch {
            // без localStorage выбор живёт только до перезагрузки
          }
        }
        return next
      })
    },
    [userId]
  )

  const setExamHidden = useCallback(
    (examKey, hidden) => {
      updatePrefs((prev) => ({
        hiddenExams: hidden ? [...new Set([...prev.hiddenExams, examKey])] : prev.hiddenExams.filter((k) => k !== examKey),
      }))
    },
    [updatePrefs]
  )

  // Отфильтровать список предметов (обычно visibleExamList()) до тех,
  // которые пользователь не скрыл.
  const filterShownExams = useCallback((list) => list.filter((e) => !prefs.hiddenExams.includes(e.key)), [prefs.hiddenExams])

  // ProSidebar/ProDashboard/Footer читают этот контекст — value ниже в
  // useMemo по той же причине, что и в AuthContext.jsx: без него любой
  // рендер провайдера (не только реальная смена prefs) рассылал бы новый
  // объект всем потребителям разом.
  const value = useMemo(
    () => ({
      hiddenExams: prefs.hiddenExams,
      setExamHidden,
      filterShownExams,
    }),
    [prefs.hiddenExams, setExamHidden, filterShownExams]
  )

  return <PersonalizationContext.Provider value={value}>{children}</PersonalizationContext.Provider>
}

export function usePersonalization() {
  const ctx = useContext(PersonalizationContext)
  if (!ctx) throw new Error('usePersonalization must be used inside <PersonalizationProvider>')
  return ctx
}
