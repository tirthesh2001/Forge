/**
 * Single source for accent colors, theme presets, and Settings UI labels/order.
 * ThemeContext applies CSS variables from this data; Settings uses the same exports for swatches and preset buttons.
 */

export const ACCENT_COLORS = {
  indigo: { dark: '#818CF8', light: '#4F46E5' },
  blue: { dark: '#6366F1', light: '#818CF8' },
  green: { dark: '#22C55E', light: '#16A34A' },
  red: { dark: '#EF4444', light: '#DC2626' },
  yellow: { dark: '#EAB308', light: '#CA8A04' },
  purple: { dark: '#A855F7', light: '#9333EA' },
  slate: { dark: '#94A3B8', light: '#475569' },
}

/** Display order for accent swatches in Settings (matches object keys above). */
export const ACCENT_ORDER = Object.keys(ACCENT_COLORS)

/** Preset id → light/dark surface tokens (ThemeContext maps these to CSS variables). */
export const THEME_PRESETS = {
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

/** Keys must exist on THEME_PRESETS. */
export const THEME_PRESET_OPTIONS = [
  { id: 'default', label: 'Default' },
  { id: 'catppuccin', label: 'Catppuccin' },
  { id: 'nord', label: 'Nord' },
]

/** Flattened swatches for Settings: `{ name, dark, light }` per accent. */
export const ACCENT_SWATCHES = ACCENT_ORDER.map((name) => ({
  name,
  dark: ACCENT_COLORS[name].dark,
  light: ACCENT_COLORS[name].light,
}))
