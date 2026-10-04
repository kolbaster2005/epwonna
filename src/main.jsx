import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { AuthProvider } from './contexts/AuthContext.jsx'
import { DialogProvider } from './contexts/DialogContext.jsx'
import { PersonalizationProvider } from './contexts/PersonalizationContext.jsx'
import './styles/main.scss'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <AuthProvider>
        <PersonalizationProvider>
          <DialogProvider>
            <App />
          </DialogProvider>
        </PersonalizationProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
