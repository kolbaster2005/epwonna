import { createContext, useContext, useEffect, useState } from 'react'
import { useAuth } from './AuthContext.jsx'

// Персонализация (страница /personalization):
// • какие курсы пользователь скрыл — скрытый курс не показывается ни в
//   левом меню (ProSidebar), ни на pro-главной (ProDashboard), ни в
//   подвале (Footer);
// • оформление подвала в pro-раскладке (ProLayout) — светлый /
//   тёмно-зелёный / графит.
// Хранится в localStorage отдельно для каждого аккаунта — в БД пока не
// пишем, так что на другом устройстве выбор нужно сделать заново.
const PersonalizationContext = createContext(null)

export const FOOTER_THEMES = ['light', 'green', 'graphite']
const DEFAULT_PREFS = { hiddenExams: [], footerTheme: 'light' }

function storageKey(userId) {
  return `personalization:${userId}`
}

function readPrefs(userId) {
  if (!userId) return DEFAULT_PREFS
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey(userId)) || '{}')
    return {
      hiddenExams: Array.isArray(parsed.hiddenExams) ? parsed.hiddenExams : [],
      footerTheme: FOOTER_THEMES.includes(parsed.footerTheme) ? parsed.footerTheme : DEFAULT_PREFS.footerTheme,
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

  function updatePrefs(patch) {
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
  }

  function setExamHidden(examKey, hidden) {
    updatePrefs((prev) => ({
      hiddenExams: hidden ? [...new Set([...prev.hiddenExams, examKey])] : prev.hiddenExams.filter((k) => k !== examKey),
    }))
  }

  function setFooterTheme(footerTheme) {
    updatePrefs(() => ({ footerTheme }))
  }

  // Отфильтровать список предметов (обычно visibleExamList(isAdmin)) до
  // тех, которые пользователь не скрыл.
  function filterShownExams(list) {
    return list.filter((e) => !prefs.hiddenExams.includes(e.key))
  }

  return (
    <PersonalizationContext.Provider
      value={{
        hiddenExams: prefs.hiddenExams,
        setExamHidden,
        filterShownExams,
        footerTheme: prefs.footerTheme,
        setFooterTheme,
      }}
    >
      {children}
    </PersonalizationContext.Provider>
  )
}

export function usePersonalization() {
  const ctx = useContext(PersonalizationContext)
  if (!ctx) throw new Error('usePersonalization must be used inside <PersonalizationProvider>')
  return ctx
}
