/** Imperative hook for programmatic copies (navigator.clipboard does not fire `copy`). */
let pushFn = () => {}

export function registerClipboardPush(fn) {
  pushFn = typeof fn === 'function' ? fn : () => {}
}

/**
 * Record a string in global clipboard history (deduped, capped).
 * Safe to call after successful navigator.clipboard.writeText.
 */
export function pushClipboard(text) {
  if (typeof text !== 'string') return
  const t = text.trim()
  if (!t || t.length > 500_000) return
  pushFn(t)
}
