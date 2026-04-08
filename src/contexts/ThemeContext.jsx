import { createContext, useContext, useState, useEffect } from 'react'

const ACCENT_COLORS = {
  indigo: { dark: '#818CF8', light: '#4F46E5' },
  blue:   { dark: '#6366F1', light: '#818CF8' },
  green:  { dark: '#22C55E', light: '#16A34A' },
  red:    { dark: '#EF4444', light: '#DC2626' },
  yellow: { dark: '#EAB308', light: '#CA8A04' },
  purple: { dark: '#A855F7', light: '#9333EA' },
  slate:  { dark: '#94A3B8', light: '#475569' }
}

const THEME_PRESETS = {
  default: {
    dark: {
      bg: '#0A0A0F', surface: '#13131A', surfaceHover: '#1a1a24', border: '#1E1E2E',
      text: '#F0F0F0', textMuted: '#6B7280', dotGrid: '#1E1E2E', btnPrimaryText: '#0A0A0F',
    },
    light: {
      bg: '#F8F9FC', surface: '#FFFFFF', surfaceHover: '#F1F3F7', border: '#E2E5EB',
      text: '#1A1D26', textMuted: '#6B7280', dotGrid: '#E2E5EB', btnPrimaryText: '#FFFFFF',
    },
  },
  catppuccin: {
    dark: {
      bg: '#1E1E2E', surface: '#181825', surfaceHover: '#313244', border: '#45475A',
      text: '#CDD6F4', textMuted: '#7F849C', dotGrid: '#313244', btnPrimaryText: '#1E1E2E',
    },
    light: {
      bg: '#EFF1F5', surface: '#E6E9EF', surfaceHover: '#CCD0DA', border: '#BCC0CC',
      text: '#4C4F69', textMuted: '#8C8FA1', dotGrid: '#E6E9EF', btnPrimaryText: '#EFF1F5',
    },
  },
  nord: {
    dark: {
      bg: '#2E3440', surface: '#3B4252', surfaceHover: '#434C5E', border: '#4C566A',
      text: '#ECEFF4', textMuted: '#D8DEE9', dotGrid: '#3B4252', btnPrimaryText: '#2E3440',
    },
    light: {
      bg: '#ECEFF4', surface: '#E5E9F0', surfaceHover: '#D8DEE9', border: '#C0C8D4',
      text: '#2E3440', textMuted: '#4C566A', dotGrid: '#D8DEE9', btnPrimaryText: '#ECEFF4',
    },
  },
}

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
