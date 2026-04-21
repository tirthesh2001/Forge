export const uid = () => crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`

export const GROUP_COLORS = ['#00D4FF', '#6366F1', '#22C55E', '#EAB308', '#A855F7', '#EF4444', '#F97316', '#06B6D4']

export const DEFAULT_BOOKMARKS = { groups: [], ungrouped: [] }

export function normalizeEntry(e) {
  return {
    id: e.id || uid(),
    url: String(e.url || ''),
    title: typeof e.title === 'string' ? e.title : '',
    description: typeof e.description === 'string' ? e.description : '',
    createdAt: typeof e.createdAt === 'number' ? e.createdAt : Date.now(),
  }
}

export function normalizeBookmarks(raw) {
  if (!raw || typeof raw !== 'object') return DEFAULT_BOOKMARKS
  const groups = Array.isArray(raw.groups)
    ? raw.groups
      .filter((g) => g && typeof g === 'object')
      .map((g) => ({
        id: g.id || uid(),
        name: typeof g.name === 'string' ? g.name : 'Untitled',
        color: typeof g.color === 'string' ? g.color : GROUP_COLORS[0],
        collapsed: Boolean(g.collapsed),
        urls: Array.isArray(g.urls) ? g.urls.filter((u) => u && typeof u === 'object' && typeof u.url === 'string').map(normalizeEntry) : [],
      }))
    : []
  const ungrouped = Array.isArray(raw.ungrouped)
    ? raw.ungrouped.filter((u) => u && typeof u === 'object' && typeof u.url === 'string').map(normalizeEntry)
    : []
  return { groups, ungrouped }
}

export function sanitizeUrl(raw) {
  const trimmed = String(raw || '').trim()
  if (!trimmed) return null
  const withScheme = /^https?:\/\//i.test(trimmed) || /^ftp:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
  try {
    const u = new URL(withScheme)
    if (!u.hostname.includes('.') && u.hostname !== 'localhost') return null
    return u.toString()
  } catch {
    return null
  }
}

export function getDomain(urlStr) {
  try { return new URL(urlStr).hostname } catch { return urlStr }
}

export function faviconUrl(urlStr) {
  try {
    const d = new URL(urlStr).hostname
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(d)}&sz=32`
  } catch {
    return null
  }
}

export function totalBookmarkCount(normalized) {
  const n = normalized || DEFAULT_BOOKMARKS
  const groupTotal = (n.groups || []).reduce((acc, g) => acc + (g.urls?.length || 0), 0)
  return groupTotal + (n.ungrouped?.length || 0)
}
