// Central registry of all keyboard shortcuts supported by Forge.
// Each shortcut has:
//   id: stable identifier
//   label: human-readable name
//   group: 'navigation' | 'global' | 'tool'
//   defaultKey: e.g. '1', 'k', 'b' (single key)
//   modifier: 'cmd' (meta/ctrl) | 'none' (no modifier needed)
//   action: 'navigate' (with `path`) | 'event' (with `eventName`)
// Layout.jsx listens once to window keydown and dispatches accordingly.
// Settings reads this registry + user overrides from localStorage to render the editor.

import { navItems } from '../components/Sidebar'

export const SHORTCUT_STORAGE_KEY = 'forge-custom-shortcuts'
export const SHORTCUT_CHANGE_EVENT = 'forge-shortcuts-changed'

const NAV_SHORTCUTS = navItems
  .filter((n) => n.path)
  .map((n) => ({
    id: `nav:${n.path}`,
    label: n.label,
    group: 'navigation',
    modifier: 'cmd',
    action: 'navigate',
    path: n.path,
    defaultKey: n.defaultKey || null,
  }))

const GLOBAL_SHORTCUTS = [
  { id: 'global:command-palette', label: 'Open Command Palette', group: 'global', modifier: 'cmd', action: 'event', eventName: 'forge-open-palette', defaultKey: 'k' },
  { id: 'global:clipboard-history', label: 'Toggle Clipboard History', group: 'global', modifier: 'cmd', action: 'event', eventName: 'forge-toggle-clipboard', defaultKey: 'i' },
  { id: 'global:theme-toggle', label: 'Toggle Theme (Dark/Light)', group: 'global', modifier: 'cmd', action: 'event', eventName: 'forge-toggle-theme', defaultKey: 'j' },
  { id: 'global:sidebar-toggle', label: 'Toggle Sidebar', group: 'global', modifier: 'cmd', action: 'event', eventName: 'forge-toggle-sidebar', defaultKey: 'b' },
]

export const ALL_SHORTCUTS = [...GLOBAL_SHORTCUTS, ...NAV_SHORTCUTS]

export function shortcutById(id) {
  return ALL_SHORTCUTS.find((s) => s.id === id)
}

export function readOverrides() {
  try {
    const raw = localStorage.getItem(SHORTCUT_STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    // Legacy format: { '5': '/color' } — key -> path. Convert to { 'nav:/color': '5' }.
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const values = Object.values(parsed)
      const isLegacy = values.every((v) => typeof v === 'string' && v.startsWith('/'))
      if (isLegacy) {
        const converted = {}
        for (const [k, p] of Object.entries(parsed)) {
          converted[`nav:${p}`] = k
        }
        return converted
      }
      return parsed
    }
    return {}
  } catch { return {} }
}

export function writeOverrides(overrides) {
  try {
    if (!overrides || Object.keys(overrides).length === 0) {
      localStorage.removeItem(SHORTCUT_STORAGE_KEY)
    } else {
      localStorage.setItem(SHORTCUT_STORAGE_KEY, JSON.stringify(overrides))
    }
    window.dispatchEvent(new Event(SHORTCUT_CHANGE_EVENT))
  } catch { /* ignore */ }
}

// Resolve the currently-active key for every shortcut.
// Overrides take precedence; a shortcut with a user-assigned empty string is "unbound".
export function resolveActive(overrides = readOverrides()) {
  const result = {}
  for (const s of ALL_SHORTCUTS) {
    if (Object.prototype.hasOwnProperty.call(overrides, s.id)) {
      result[s.id] = overrides[s.id]
    } else {
      result[s.id] = s.defaultKey
    }
  }
  return result
}

// Given an active map (id -> key), produce a reverse lookup keyed by "modifier:key" for fast dispatch.
export function buildDispatchMap(active = resolveActive()) {
  const map = {}
  for (const s of ALL_SHORTCUTS) {
    const key = active[s.id]
    if (!key) continue
    const combo = `${s.modifier}:${key.toLowerCase()}`
    if (!map[combo]) map[combo] = s
  }
  return map
}

export function keyComboFor(e) {
  const mod = e.metaKey || e.ctrlKey ? 'cmd' : 'none'
  return `${mod}:${(e.key || '').toLowerCase()}`
}

// Event names used by global shortcuts — exported so subscribers can listen.
export const GLOBAL_EVENTS = {
  OPEN_PALETTE: 'forge-open-palette',
  TOGGLE_CLIPBOARD: 'forge-toggle-clipboard',
  TOGGLE_THEME: 'forge-toggle-theme',
  TOGGLE_SIDEBAR: 'forge-toggle-sidebar',
}
