/**
 * Singleton web worker for parser.worker.js — request/response by numeric id.
 */
let worker
let nextId = 1
const pending = new Map()

function getWorker() {
  if (!worker) {
    worker = new Worker(new URL('./parser.worker.js', import.meta.url), { type: 'module' })
    worker.onmessage = (e) => {
      const msg = e.data || {}
      const { id, type, error, data, large, byteLength } = msg
      if (id == null) return
      const p = pending.get(id)
      if (!p) return
      pending.delete(id)
      if (type === 'error' || type === 'json-error' || type === 'diff-myers-error') {
        p.reject(new Error(error || 'Worker error'))
        return
      }
      if (type === 'json-result') {
        p.resolve({ parsed: data, byteLength })
        return
      }
      if (type === 'diff-myers-result') {
        p.resolve(data)
        return
      }
      if (type === 'diff-result') {
        p.resolve(data)
        return
      }
      if (type === 'csv-result') {
        p.resolve({ rows: data, large })
        return
      }
      p.resolve(msg)
    }
    worker.onerror = (err) => {
      pending.forEach((p) => p.reject(err))
      pending.clear()
    }
  }
  return worker
}

function post(type, data) {
  const id = nextId++
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject })
    getWorker().postMessage({ type, id, data })
  })
}

export function workerDiffLinesMyers(left, right) {
  return post('diff-lines-myers', { left, right })
}

export function workerParseJson(text) {
  return post('parse-json', typeof text === 'string' ? text : '')
}

export function workerParseCsv(text) {
  return post('parse-csv', typeof text === 'string' ? text : '')
}
