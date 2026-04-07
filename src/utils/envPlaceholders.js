/**
 * Replace {{key}} or {{ key }} in a string using vars[key]. Unknown keys stay unchanged.
 */
export function applyEnvPlaceholders(text, vars) {
  if (text == null || typeof text !== 'string') return text
  if (!vars || typeof vars !== 'object') return text
  return text.replace(/\{\{\s*([a-zA-Z0-9_-]+)\s*\}\}/g, (match, key) => {
    if (Object.prototype.hasOwnProperty.call(vars, key)) {
      const v = vars[key]
      return v == null ? '' : String(v)
    }
    return match
  })
}
