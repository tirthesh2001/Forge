import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { ThemeProvider } from './contexts/ThemeContext'
import { DeviceProvider } from './contexts/DeviceContext'
import { ClipboardHistoryProvider } from './contexts/ClipboardHistoryContext'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <DeviceProvider>
        <ClipboardHistoryProvider>
          <App />
        </ClipboardHistoryProvider>
      </DeviceProvider>
    </ThemeProvider>
  </StrictMode>,
)
