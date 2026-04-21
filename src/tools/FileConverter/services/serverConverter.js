// Server-side conversion via CloudConvert REST API.
// Supports virtually any file format. Requires the user to supply a CloudConvert API key in settings.
// Key is stored locally (forge-cloudconvert-api-key) and never sent anywhere except api.cloudconvert.com.

import { nameWithoutExt } from './fileIO'

const API_BASE = 'https://api.cloudconvert.com/v2'
const KEY_STORAGE = 'forge-cloudconvert-api-key'

export function getServerApiKey() {
  try { return localStorage.getItem(KEY_STORAGE) || '' } catch { return '' }
}

export function setServerApiKey(key) {
  try {
    if (key) localStorage.setItem(KEY_STORAGE, key)
    else localStorage.removeItem(KEY_STORAGE)
  } catch { /* ignore */ }
}

export function hasServerConfig() {
  return Boolean(getServerApiKey())
}

// Hardcoded matrix of practical source->target pairs supported server-side.
// This list intentionally covers formats the client can't handle well.
const SERVER_MATRIX = {
  // Images (with HEIC/SVG/TIFF etc.)
  heic: ['png', 'jpeg', 'webp', 'pdf'],
  svg: ['png', 'jpeg', 'webp', 'pdf'],
  tiff: ['png', 'jpeg', 'webp', 'pdf'],
  // Office docs
  docx: ['pdf', 'html', 'txt', 'md', 'odt', 'rtf', 'doc', 'epub'],
  doc: ['pdf', 'docx', 'html', 'txt', 'odt', 'rtf'],
  odt: ['pdf', 'docx', 'doc', 'html', 'txt', 'rtf'],
  rtf: ['pdf', 'docx', 'doc', 'html', 'txt', 'odt'],
  pdf: ['docx', 'doc', 'odt', 'rtf', 'html', 'png', 'jpeg', 'txt', 'epub'],
  epub: ['pdf', 'docx', 'html', 'txt', 'mobi'],
  // Spreadsheets
  xlsx: ['pdf', 'csv', 'tsv', 'xls', 'ods', 'html'],
  xls: ['pdf', 'csv', 'tsv', 'xlsx', 'ods', 'html'],
  ods: ['pdf', 'csv', 'xlsx', 'xls', 'html'],
  csv: ['xlsx', 'xls', 'ods', 'pdf', 'html', 'tsv', 'json'],
  tsv: ['xlsx', 'xls', 'csv', 'json'],
  // Presentations
  pptx: ['pdf', 'ppt', 'odp', 'jpeg', 'png', 'html'],
  ppt: ['pdf', 'pptx', 'odp', 'jpeg', 'png'],
  odp: ['pdf', 'pptx', 'ppt'],
  // Audio
  mp3: ['wav', 'ogg', 'flac', 'aac', 'm4a'],
  wav: ['mp3', 'ogg', 'flac', 'aac', 'm4a'],
  ogg: ['mp3', 'wav', 'flac', 'aac', 'm4a'],
  flac: ['mp3', 'wav', 'ogg', 'aac', 'm4a'],
  aac: ['mp3', 'wav', 'ogg', 'flac', 'm4a'],
  m4a: ['mp3', 'wav', 'ogg', 'flac', 'aac'],
  // Video
  mp4: ['webm', 'mov', 'avi', 'mkv', 'gif', 'mp3'],
  webm: ['mp4', 'mov', 'avi', 'mkv', 'gif', 'mp3'],
  mov: ['mp4', 'webm', 'avi', 'mkv', 'gif', 'mp3'],
  avi: ['mp4', 'webm', 'mov', 'mkv', 'gif', 'mp3'],
  mkv: ['mp4', 'webm', 'mov', 'avi', 'gif', 'mp3'],
  // Archives
  zip: ['tar', '7z', 'rar'],
  tar: ['zip', '7z', 'gz'],
  gz: ['tar', 'zip'],
  '7z': ['zip', 'tar'],
  rar: ['zip', 'tar'],
  // Bonus: images passthrough for convenience
  png: ['pdf', 'docx', 'heic', 'tiff', 'svg'],
  jpeg: ['pdf', 'docx', 'heic', 'tiff'],
  webp: ['pdf', 'png', 'jpeg'],
}

export function getServerTargets(srcFormat) {
  if (!srcFormat) return []
  return SERVER_MATRIX[srcFormat] || []
}

export function canConvertServer(srcFormat, targetFormat) {
  const t = SERVER_MATRIX[srcFormat]
  return Array.isArray(t) && t.includes(targetFormat)
}

async function ccFetch(apiKey, path, init = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      ...(init.body && !(init.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
      ...(init.headers || {}),
    },
  })
  if (!res.ok) {
    let msg = `Server conversion failed (${res.status})`
    try { const j = await res.json(); msg = j.message || j.error || msg } catch { /* ignore */ }
    if (res.status === 401) msg = 'Invalid CloudConvert API key. Update it in Settings.'
    if (res.status === 402) msg = 'CloudConvert conversion credits exhausted. Check your account.'
    throw new Error(msg)
  }
  return res.json()
}

export async function convertServer(file, srcFormat, targetFormat, { onProgress } = {}) {
  const apiKey = getServerApiKey()
  if (!apiKey) throw new Error('No CloudConvert API key configured. Add one in Settings to use server-side conversion.')

  onProgress?.({ phase: 'creating', pct: 5 })

  const jobRes = await ccFetch(apiKey, '/jobs', {
    method: 'POST',
    body: JSON.stringify({
      tasks: {
        upload: { operation: 'import/upload' },
        convert: { operation: 'convert', input: 'upload', input_format: srcFormat, output_format: targetFormat },
        export: { operation: 'export/url', input: 'convert' },
      },
    }),
  })

  const uploadTask = jobRes.data.tasks.find((t) => t.name === 'upload')
  if (!uploadTask) throw new Error('Failed to initialize upload task')
  const form = uploadTask.result.form
  onProgress?.({ phase: 'uploading', pct: 20 })

  const fd = new FormData()
  Object.entries(form.parameters || {}).forEach(([k, v]) => fd.append(k, v))
  fd.append('file', file)
  const up = await fetch(form.url, { method: 'POST', body: fd })
  if (!up.ok) throw new Error(`Upload failed (${up.status})`)

  onProgress?.({ phase: 'converting', pct: 40 })

  const jobId = jobRes.data.id
  const started = Date.now()
  let downloadUrl = null
  while (Date.now() - started < 5 * 60_000) {
    await new Promise((r) => setTimeout(r, 2000))
    const status = await ccFetch(apiKey, `/jobs/${jobId}`)
    const job = status.data
    if (job.status === 'error') {
      const errTask = job.tasks.find((t) => t.status === 'error')
      throw new Error(errTask?.message || 'Conversion task failed on server')
    }
    const exp = job.tasks.find((t) => t.name === 'export')
    if (exp?.status === 'finished' && exp.result?.files?.[0]?.url) {
      downloadUrl = exp.result.files[0].url
      break
    }
    const convert = job.tasks.find((t) => t.name === 'convert')
    if (convert?.status === 'processing') onProgress?.({ phase: 'converting', pct: 60 })
  }
  if (!downloadUrl) throw new Error('Server conversion timed out. Try again or use client-side conversion.')

  onProgress?.({ phase: 'downloading', pct: 85 })

  const dl = await fetch(downloadUrl)
  if (!dl.ok) throw new Error(`Download failed (${dl.status})`)
  const blob = await dl.blob()
  onProgress?.({ phase: 'done', pct: 100 })

  const filename = `${nameWithoutExt(file.name)}.${targetFormat === 'jpeg' ? 'jpg' : targetFormat}`
  return { blob, filename, mime: blob.type || 'application/octet-stream' }
}
