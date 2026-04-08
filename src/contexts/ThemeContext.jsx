import { createContext, useContext, useState, useEffect } from 'react'
import { ACCENT_COLORS, THEME_PRESETS } from '../theme/forgeThemeConfig'

const ThemeContext = createContext()

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState(() => {
    try { return localStorage.getItem('forge-theme-mode') || 'dark' } catch { return 'dark' }
  })
  const [accentName, setAccentName] = useState(() => {
    try {
      const raw = localStorage.getItem('forge-accent') || 'indigo'
      // Legacy cyan was removed in favor of indigo; map so saved data and UI stay aligned
      return raw === 'cyan' ? 'indigo' : raw
    } catch {
      return 'indigo'
    }
  })
  const [customAccent, setCustomAccent] = useState(() => {
    try { return localStorage.getItem('forge-custom-accent') || '' } catch { return '' }
  })
  const [preset, setPreset] = useState(() => {
    try {
      const p = localStorage.getItem('forge-theme-preset') || 'default'
      return THEME_PRESETS[p] ? p : 'default'
    } catch {
      return 'default'
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem('forge-theme-mode', mode)
      localStorage.setItem('forge-accent', accentName)
      localStorage.setItem('forge-theme-preset', preset)
      if (customAccent) localStorage.setItem('forge-custom-accent', customAccent)
    } catch { /* storage blocked or full */ }

    const themeColors = THEME_PRESETS[preset]?.[mode] || THEME_PRESETS.default[mode]
    const accent = accentName === 'custom'
      ? (customAccent || ACCENT_COLORS.indigo[mode])
      : (ACCENT_COLORS[accentName]?.[mode] || ACCENT_COLORS.indigo[mode])

    const root = document.documentElement
    root.style.setProperty('--bg', themeColors.bg)
    root.style.setProperty('--surface', themeColors.surface)
    root.style.setProperty('--surface-hover', themeColors.surfaceHover)
    root.style.setProperty('--border', themeColors.border)
    root.style.setProperty('--text', themeColors.text)
    root.style.setProperty('--text-muted', themeColors.textMuted)
    root.style.setProperty('--accent', accent)
    root.style.setProperty('--dot-grid', themeColors.dotGrid)
    root.style.setProperty('--btn-primary-text', themeColors.btnPrimaryText)
    root.setAttribute('data-theme', mode)
  }, [mode, accentName, customAccent, preset])

  const toggleMode = () => setMode((m) => (m === 'dark' ? 'light' : 'dark'))

  return (
    <ThemeContext.Provider value={{
      mode, accentName, setAccentName, toggleMode,
      accentColors: ACCENT_COLORS,
      preset, setPreset, presets: THEME_PRESETS,
      customAccent, setCustomAccent,
    }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
