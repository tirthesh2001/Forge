/**
 * Web Worker for parsing large JSON/CSV and simple line diffs off the main thread.
 * Message shape: { type: string, data?: unknown }
 */

const LARGE_FILE_HINT = 5 * 1024 * 1024

function parseCSVLine(line) {
  const fields = []
  let field = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        field += '"'
        i += 1
      } else {
        inQuotes = !inQuotes
      }
    } else if (ch === ',' && !inQuotes) {
      fields.push(field)
      field = ''
    } else {
      field += ch
    }
  }
  fields.push(field)
  return fields
}

/**
 * Line-by-line comparison (not a full Myers diff). Each row index is compared in parallel.
 * Output chunks align with common diff UIs: unchanged `value`, or `added` / `removed`.
 */
function diffLinesSimple(left, right) {
  const leftLines = left.split('\n')
  const rightLines = right.split('\n')
  const maxLen = Math.max(leftLines.length, rightLines.length)
  const changes = []

  for (let i = 0; i < maxLen; i++) {
    const l = leftLines[i]
    const r = rightLines[i]

    if (l === r) {
      changes.push({ value: (l ?? '') + '\n' })
    } else {
      if (l !== undefined) changes.push({ removed: true, value: l + '\n' })
      if (r !== undefined) changes.push({ added: true, value: r + '\n' })
    }
  }

  return changes
}

self.onmessage = function (e) {
  const { type, data } = e.data || {}

  switch (type) {
    case 'parse-json': {
      try {
        const parsed = JSON.parse(data)
        self.postMessage({
          type: 'json-result',
          data: parsed,
          byteLength: typeof data === 'string' ? data.length : undefined,
        })
      } catch (err) {
        self.postMessage({ type: 'json-error', error: err.message })
      }
      break
    }

    case 'diff-lines': {
      const { left, right } = data || {}
      const leftStr = typeof left === 'string' ? left : ''
      const rightStr = typeof right === 'string' ? right : ''
      const changes = diffLinesSimple(leftStr, rightStr)
      self.postMessage({ type: 'diff-result', data: changes })
      break
    }

    case 'parse-csv': {
      const text = typeof data === 'string' ? data : ''
      const lines = text.split(/\r?\n/)
      const result = lines.map((line) => parseCSVLine(line))
      self.postMessage({
        type: 'csv-result',
        data: result,
        large: text.length > LARGE_FILE_HINT,
      })
      break
    }

    default:
      self.postMessage({ type: 'error', error: `Unknown message type: ${type}` })
  }
}
