/**
 * Web Worker for parsing large JSON/CSV and line diffs off the main thread.
 * Message shape: { type, id?, data? }
 */
import { diffLines } from 'diff'

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

/** Line-by-line comparison (not Myers). */
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
  const msg = e.data || {}
  const { type, id, data } = msg

  switch (type) {
    case 'parse-json': {
      const payload = id !== undefined ? data : msg.data
      try {
        const parsed = JSON.parse(typeof payload === 'string' ? payload : '')
        self.postMessage({
          type: 'json-result',
          id,
          data: parsed,
          byteLength: typeof payload === 'string' ? payload.length : undefined,
        })
      } catch (err) {
        self.postMessage({ type: 'json-error', id, error: err.message })
      }
      break
    }

    case 'diff-lines-myers': {
      const { left, right } = data || {}
      const leftStr = typeof left === 'string' ? left : ''
      const rightStr = typeof right === 'string' ? right : ''
      try {
        const result = diffLines(leftStr, rightStr)
        self.postMessage({ type: 'diff-myers-result', id, data: result })
      } catch (err) {
        self.postMessage({ type: 'diff-myers-error', id, error: err.message })
      }
      break
    }

    case 'diff-lines': {
      const { left, right } = data || {}
      const leftStr = typeof left === 'string' ? left : ''
      const rightStr = typeof right === 'string' ? right : ''
      const changes = diffLinesSimple(leftStr, rightStr)
      self.postMessage({ type: 'diff-result', id, data: changes })
      break
    }

    case 'parse-csv': {
      const text = typeof data === 'string' ? data : (typeof msg.data === 'string' ? msg.data : '')
      const lines = text.split(/\r?\n/)
      const result = lines.map((line) => parseCSVLine(line))
      self.postMessage({
        type: 'csv-result',
        id,
        data: result,
        large: text.length > LARGE_FILE_HINT,
      })
      break
    }

    default:
      self.postMessage({ type: 'error', id, error: `Unknown message type: ${type}` })
  }
}
