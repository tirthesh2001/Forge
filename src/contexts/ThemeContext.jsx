import { createContext, useContext, useState, useEffect } from 'react'

const ACCENT_COLORS = {
  cyan:   { dark: '#00D4FF', light: '#0891B2' },
  blue:   { dark: '#6366F1', light: '#818CF8' },
  green:  { dark: '#22C55E', light: '#16A34A' },
  red:    { dark: '#EF4444', light: '#DC2626' },
  yellow: { dark: '#EAB308', light: '#CA8A04' },
  purple: { dark: '#A855F7', light: '#9333EA' },
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
  solarized: {
    dark: {
      bg: '#002B36', surface: '#073642', surfaceHover: '#0a4050', border: '#586E75',
      text: '#FDF6E3', textMuted: '#839496', dotGrid: '#073642', btnPrimaryText: '#002B36',
    },
    light: {
      bg: '#FDF6E3', surface: '#EEE8D5', surfaceHover: '#E8E1CB', border: '#93A1A1',
      text: '#002B36', textMuted: '#657B83', dotGrid: '#EEE8D5', btnPrimaryText: '#FDF6E3',
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
  dracula: {
    dark: {
      bg: '#282A36', surface: '#383A59', surfaceHover: '#44475A', border: '#6272A4',
      text: '#F8F8F2', textMuted: '#6272A4', dotGrid: '#383A59', btnPrimaryText: '#282A36',
    },
    light: {
      bg: '#F8F8F2', surface: '#EAEAE6', surfaceHover: '#E0E0DC', border: '#C0C0BC',
      text: '#282A36', textMuted: '#6272A4', dotGrid: '#EAEAE6', btnPrimaryText: '#F8F8F2',
    },
  },
}

const ThemeContext = createContext()

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState(() => {
    try { return localStorage.getItem('forge-theme-mode') || 'dark' } catch { return 'dark' }
  })
  const [accentName, setAccentName] = useState(() => {
    try { return localStorage.getItem('forge-accent') || 'cyan' } catch { return 'cyan' }
  })
  const [customAccent, setCustomAccent] = useState(() => {
    try { return localStorage.getItem('forge-custom-accent') || '' } catch { return '' }
  })
  const [preset, setPreset] = useState(() => {
    try { return localStorage.getItem('forge-theme-preset') || 'default' } catch { return 'default' }
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
      ? (customAccent || '#00D4FF')
      : (ACCENT_COLORS[accentName]?.[mode] || ACCENT_COLORS.cyan[mode])

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
