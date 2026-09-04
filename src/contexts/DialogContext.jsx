import { createContext, useCallback, useContext, useState } from 'react'

const DialogContext = createContext(null)

export function DialogProvider({ children }) {
  const [dialog, setDialog] = useState(null) // { type: 'confirm' | 'alert', message, resolve }

  const confirm = useCallback((message) => {
    return new Promise((resolve) => setDialog({ type: 'confirm', message, resolve }))
  }, [])

  const alertMessage = useCallback((message) => {
    return new Promise((resolve) => setDialog({ type: 'alert', message, resolve }))
  }, [])

  function close(result) {
    dialog?.resolve(result)
    setDialog(null)
  }

  const lines = Array.isArray(dialog?.message) ? dialog.message : dialog?.message ? [dialog.message] : []

  return (
    <DialogContext.Provider value={{ confirm, alertMessage }}>
      {children}
      {dialog && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && close(dialog.type === 'confirm' ? false : undefined)}>
          <div className="modal confirm-modal">
            <div className="confirm-modal-body">
              {lines.map((line, i) => (
                <p key={i}>{line}</p>
              ))}
            </div>
            <div className="confirm-modal-actions">
              {dialog.type === 'confirm' ? (
                <>
                  <button type="button" className="btn btn-outline" onClick={() => close(false)}>Отмена</button>
                  <button type="button" className="btn btn-primary" onClick={() => close(true)}>Подтвердить</button>
                </>
              ) : (
                <button type="button" className="btn btn-primary" onClick={() => close(undefined)}>Понятно</button>
              )}
            </div>
          </div>
        </div>
      )}
    </DialogContext.Provider>
  )
}

export function useDialog() {
  const ctx = useContext(DialogContext)
  if (!ctx) throw new Error('useDialog must be used within DialogProvider')
  return ctx
}
