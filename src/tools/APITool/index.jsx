import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import toast from 'react-hot-toast'
import {
  Send, Plus, Trash2, Copy, Clock, ChevronDown, ChevronUp,
  AlertCircle, Save, FolderOpen, Code, Search, RotateCcw, X,
  Check, Eye, EyeOff, Layers, Upload, RefreshCw,
} from 'lucide-react'
import useCloudState from '../../hooks/useCloudState'
import ToolHeader from '../../components/ToolHeader'
import { applyEnvPlaceholders } from '../../utils/envPlaceholders'
import { copyWithHistory } from '../../utils/copyWithHistory'
import { parseCurl } from '../../utils/parseCurl'

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']

const METHOD_COLORS = {
  GET: '#22C55E', POST: '#3B82F6', PUT: '#F97316',
  PATCH: '#A855F7', DELETE: '#EF4444', HEAD: '#64748B', OPTIONS: '#64748B',
}

function methodBadgeStyle(m, active) {
  const c = METHOD_COLORS[m] || '#64748B'
  return {
    padding: '4px 10px', fontSize: 11, fontWeight: 700, borderRadius: 6,
    border: `1px solid ${active ? c : 'var(--border)'}`,
    background: active ? `${c}20` : 'var(--bg)',
    color: active ? c : 'var(--text-muted)',
    cursor: 'pointer', fontFamily: 'var(--font-code)', letterSpacing: '0.02em',
  }
}

function statusColor(code) {
  if (code >= 200 && code < 300) return '#22C55E'
  if (code >= 300 && code < 400) return '#EAB308'
  if (code >= 400 && code < 500) return '#F97316'
  if (code >= 500) return '#EF4444'
  return 'var(--text-muted)'
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

const BODY_TYPES = [
  { value: 'none', label: 'None' },
  { value: 'application/json', label: 'JSON' },
  { value: 'text/plain', label: 'Text' },
  { value: 'application/xml', label: 'XML' },
  { value: 'application/x-www-form-urlencoded', label: 'x-www-form-urlencoded' },
  { value: 'multipart/form-data', label: 'Form Data' },
]

const COMMON_HEADERS = [
  'Accept', 'Accept-Encoding', 'Accept-Language', 'Authorization',
  'Cache-Control', 'Content-Type', 'Cookie', 'Origin', 'Referer',
  'User-Agent', 'X-Requested-With', 'X-API-Key',
]

const uid = () => crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`

const DEFAULT_API_ENVS = {
  activeId: 'dev',
  environments: [
    { id: 'dev', name: 'Development', vars: { baseUrl: '', token: '' } },
    { id: 'staging', name: 'Staging', vars: { baseUrl: '', token: '' } },
    { id: 'prod', name: 'Production', vars: { baseUrl: '', token: '' } },
  ],
}

function normalizeApiEnvs(raw) {
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.environments) || raw.environments.length === 0) {
    return DEFAULT_API_ENVS
  }
  const environments = raw.environments.map((e) => ({
    id: e.id || uid(),
    name: e.name || e.id || 'Env',
    vars: e.vars && typeof e.vars === 'object' ? { ...e.vars } : {},
  }))
  const activeId = raw.activeId && environments.some((e) => e.id === raw.activeId)
    ? raw.activeId
    : environments[0].id
  return { activeId, environments }
}

const emptyRow = () => ({ id: uid(), key: '', value: '', enabled: true })

const inputStyle = {
  flex: 1, minWidth: 0, padding: '7px 10px', borderRadius: 6,
  border: '1px solid var(--border)', background: 'var(--bg)',
  color: 'var(--text)', fontSize: 12, fontFamily: 'var(--font-code)',
  outline: 'none', transition: 'border-color 0.15s',
}

function buildUrl(base, paramRows) {
  const trimmed = (base || '').trim()
  if (!trimmed) return ''
  try {
    const u = new URL(trimmed.includes('://') ? trimmed : `https://${trimmed}`)
    u.search = ''
    paramRows.filter((p) => p.key && p.enabled).forEach((p) => u.searchParams.append(p.key, p.value ?? ''))
    return u.toString()
  } catch {
    return trimmed
  }
}

function parseQuery(urlStr) {
  try {
    const u = new URL(urlStr)
    const rows = []
    u.searchParams.forEach((v, k) => rows.push({ id: uid(), key: k, value: v, enabled: true }))
    return rows.length ? rows : [emptyRow()]
  } catch {
    return [emptyRow()]
  }
}

function stripQuery(urlStr) {
  try { const u = new URL(urlStr); u.search = ''; return u.toString() }
  catch { const q = urlStr.indexOf('?'); return q >= 0 ? urlStr.slice(0, q) : urlStr }
}

function prettyJson(raw) {
  try { return JSON.stringify(JSON.parse(raw), null, 2) } catch { return raw }
}

function classifyError(err) {
  const msg = err?.message || String(err)
  const lower = msg.toLowerCase()
  if (err?.name === 'AbortError' || lower.includes('aborted')) {
    return { type: 'timeout', title: 'Request timed out', detail: 'The server did not respond in time. Try increasing the timeout or check if the server is reachable.' }
  }
  if (lower.includes('failed to fetch') || lower.includes('networkerror') || lower.includes('load failed') || err?.name === 'TypeError') {
    if (typeof window !== 'undefined' && window.location.protocol === 'https:' && /^http:\/\//i.test(msg)) {
      return { type: 'mixed', title: 'Mixed content blocked', detail: 'Your browser blocked this HTTP request because Forge is served over HTTPS. Use an HTTPS endpoint or run Forge locally.' }
    }
    return { type: 'cors', title: 'Network or CORS error', detail: 'Could not reach the server. This is commonly caused by CORS restrictions, a wrong URL, or the server being down. If CORS is the issue, the server must include Access-Control-Allow-Origin headers, or use a proxy.' }
  }
  if (lower.includes('ssl') || lower.includes('cert') || lower.includes('tls')) {
    return { type: 'ssl', title: 'SSL/TLS error', detail: 'The server has an invalid or expired certificate. If testing locally, try using HTTP or accept the certificate in your browser first.' }
  }
  if (lower.includes('dns') || lower.includes('not found') || lower.includes('resolve')) {
    return { type: 'dns', title: 'DNS resolution failed', detail: 'Could not resolve the hostname. Check the URL for typos and ensure the domain exists.' }
  }
  return { type: 'unknown', title: msg, detail: 'An unexpected error occurred. Check the URL and your network connection.' }
}

function generateCurl(method, url, headers, body, bodyContentType, authType, bearerToken, basicUser, basicPass) {
  const parts = [`curl -X ${method}`]
  parts.push(`  '${url}'`)
  headers.filter((h) => h.key && h.enabled).forEach((h) => parts.push(`  -H '${h.key}: ${h.value}'`))
  if (authType === 'bearer' && bearerToken) parts.push(`  -H 'Authorization: Bearer ${bearerToken}'`)
  if (authType === 'basic' && (basicUser || basicPass)) parts.push(`  -u '${basicUser}:${basicPass}'`)
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) && body && bodyContentType !== 'none') {
    parts.push(`  -d '${body.replace(/'/g, "'\\''")}'`)
  }
  return parts.join(' \\\n')
}

function generateFetch(method, url, headers, body, bodyContentType, authType, bearerToken, basicUser, basicPass) {
  const opts = { method }
  const hdrs = {}
  headers.filter((h) => h.key && h.enabled).forEach((h) => { hdrs[h.key] = h.value })
  if (authType === 'bearer' && bearerToken) hdrs['Authorization'] = `Bearer ${bearerToken}`
  if (authType === 'basic' && (basicUser || basicPass)) hdrs['Authorization'] = `Basic ${btoa(`${basicUser}:${basicPass}`)}`
  if (Object.keys(hdrs).length) opts.headers = hdrs
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) && body && bodyContentType !== 'none') opts.body = body
  return `const response = await fetch('${url}', ${JSON.stringify(opts, null, 2)});\nconst data = await response.json();`
}

function KVEditor({ rows, onChange, onAdd, onRemove, placeholder = ['Key', 'Value'], suggestions }) {
  const [focusedId, setFocusedId] = useState(null)
  const [showSuggestions, setShowSuggestions] = useState(false)

  const update = (id, field, val) => onChange(rows.map((r) => r.id === id ? { ...r, [field]: val } : r))
  const toggle = (id) => onChange(rows.map((r) => r.id === id ? { ...r, enabled: !r.enabled } : r))

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '28px 1fr 1fr 28px', gap: 6, fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4, padding: '0 2px' }}>
        <span />
        <span>{placeholder[0]}</span>
        <span>{placeholder[1]}</span>
        <span />
      </div>
      {rows.map((row) => (
        <div key={row.id} style={{ display: 'grid', gridTemplateColumns: '28px 1fr 1fr 28px', gap: 6, marginBottom: 4, alignItems: 'center', opacity: row.enabled ? 1 : 0.45 }}>
          <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <input type="checkbox" checked={row.enabled} onChange={() => toggle(row.id)}
              style={{ width: 14, height: 14, accentColor: 'var(--accent)', cursor: 'pointer' }} />
          </label>
          <div style={{ position: 'relative' }}>
            <input placeholder={placeholder[0]} value={row.key}
              onChange={(e) => update(row.id, 'key', e.target.value)}
              onFocus={() => { setFocusedId(row.id); if (suggestions) setShowSuggestions(true) }}
              onBlur={() => setTimeout(() => { setFocusedId(null); setShowSuggestions(false) }, 150)}
              style={inputStyle} />
            {suggestions && showSuggestions && focusedId === row.id && !row.key && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10, maxHeight: 160, overflowY: 'auto', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
                {suggestions.filter((s) => !rows.find((r) => r.key === s)).map((s) => (
                  <button key={s} type="button"
                    onMouseDown={(e) => { e.preventDefault(); update(row.id, 'key', s); setShowSuggestions(false) }}
                    style={{ display: 'block', width: '100%', padding: '6px 10px', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', fontSize: 12, fontFamily: 'var(--font-code)', color: 'var(--text)' }}>
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
          <input placeholder={placeholder[1]} value={row.value}
            onChange={(e) => update(row.id, 'value', e.target.value)} style={inputStyle} />
          <button type="button" onClick={() => onRemove(row.id)} title="Remove"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}>
            <Trash2 size={14} />
          </button>
        </div>
      ))}
      <button type="button" onClick={onAdd}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 8px', marginTop: 2, background: 'none', border: '1px dashed var(--border)', borderRadius: 6, cursor: 'pointer', color: 'var(--text-muted)', fontSize: 11 }}>
        <Plus size={12} /> Add row
      </button>
    </div>
  )
}

function BulkEditor({ value, onChange, placeholder }) {
  return (
    <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
      style={{ width: '100%', minHeight: 120, padding: 10, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontFamily: 'var(--font-code)', fontSize: 12, resize: 'vertical', lineHeight: 1.5 }} />
  )
}

function rowsToBulk(rows) {
  return rows.filter((r) => r.key).map((r) => `${r.enabled ? '' : '// '}${r.key}: ${r.value}`).join('\n')
}

function bulkToRows(text) {
  return text.split('\n').filter(Boolean).map((line) => {
    const disabled = line.startsWith('// ')
    const clean = disabled ? line.slice(3) : line
    const idx = clean.indexOf(':')
    const key = idx >= 0 ? clean.slice(0, idx).trim() : clean.trim()
    const value = idx >= 0 ? clean.slice(idx + 1).trim() : ''
    return { id: uid(), key, value, enabled: !disabled }
  }).concat([emptyRow()])
}

export default function APITool() {
  const [history, setHistory] = useCloudState('api-client-history', [])
  const [collections, setCollections] = useCloudState('api-client-collections', [])
  const [envConfigRaw, setEnvConfig] = useCloudState('api-client-environments', DEFAULT_API_ENVS)
  const envConfig = useMemo(() => normalizeApiEnvs(envConfigRaw), [envConfigRaw])

  const [method, setMethod] = useState('GET')
  const [url, setUrl] = useState('')
  const [params, setParams] = useState(() => [emptyRow()])
  const [headers, setHeaders] = useState(() => [emptyRow()])
  const [body, setBody] = useState('')
  const [bodyContentType, setBodyContentType] = useState('none')
  const [formDataRows, setFormDataRows] = useState(() => [emptyRow()])
  const [authType, setAuthType] = useState('none')
  const [bearerToken, setBearerToken] = useState('')
  const [basicUser, setBasicUser] = useState('')
  const [basicPass, setBasicPass] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const [reqTab, setReqTab] = useState('params')
  const [resTab, setResTab] = useState('body')
  const [historyOpen, setHistoryOpen] = useState(false)
  const [collectionsOpen, setCollectionsOpen] = useState(false)
  const [bulkEditHeaders, setBulkEditHeaders] = useState(false)
  const [bulkEditParams, setBulkEditParams] = useState(false)
  const [responseRaw, setResponseRaw] = useState(false)
  const [codeSnippetLang, setCodeSnippetLang] = useState(null)
  const [responseSearch, setResponseSearch] = useState('')
  const [saveName, setSaveName] = useState('')
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [envPanelOpen, setEnvPanelOpen] = useState(false)

  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState(null)
  const [statusText, setStatusText] = useState('')
  const [responseTimeMs, setResponseTimeMs] = useState(null)
  const [responseBody, setResponseBody] = useState('')
  const [responseSize, setResponseSize] = useState(0)
  const [responseContentType, setResponseContentType] = useState('')
  const [responseHeaderEntries, setResponseHeaderEntries] = useState([])
  const [errorMessage, setErrorMessage] = useState(null)
  const [errorClassification, setErrorClassification] = useState(null)
  const [corsHint, setCorsHint] = useState(false)
  const [timeoutSec, setTimeoutSec] = useState(30)
  const [curlImportOpen, setCurlImportOpen] = useState(false)
  const [curlInput, setCurlInput] = useState('')

  const urlInputRef = useRef(null)
  const abortRef = useRef(null)
  const historyScrollRef = useRef(null)
  const HISTORY_ROW_H = 44
  const historyVirtualizer = useVirtualizer({
    count: history.length,
    getScrollElement: () => historyScrollRef.current,
    estimateSize: () => HISTORY_ROW_H,
    overscan: 12,
  })

  const activeVars = useMemo(() => {
    const e = envConfig.environments.find((x) => x.id === envConfig.activeId)
    return e?.vars || {}
  }, [envConfig])

  const resolvedUrl = useMemo(() => applyEnvPlaceholders(url.trim(), activeVars), [url, activeVars])
  const resolvedParams = useMemo(
    () => params.map((p) => ({ ...p, value: applyEnvPlaceholders(String(p.value ?? ''), activeVars) })),
    [params, activeVars],
  )

  const finalUrl = useMemo(() => buildUrl(resolvedUrl, resolvedParams), [resolvedUrl, resolvedParams])

  const updateActiveEnvVars = useCallback((updater) => {
    setEnvConfig((prev) => {
      const n = normalizeApiEnvs(prev)
      return {
        ...n,
        environments: n.environments.map((e) =>
          e.id === n.activeId ? { ...e, vars: typeof updater === 'function' ? updater(e.vars) : updater } : e,
        ),
      }
    })
  }, [setEnvConfig])

  const setActiveEnvId = useCallback((id) => {
    setEnvConfig((prev) => {
      const n = normalizeApiEnvs(prev)
      return { ...n, activeId: id }
    })
  }, [setEnvConfig])

  const resolvedHeadersForCodegen = useMemo(
    () => headers.map((h) => ({ ...h, value: applyEnvPlaceholders(h.value ?? '', activeVars) })),
    [headers, activeVars],
  )

  const currentEnv = useMemo(
    () => envConfig.environments.find((e) => e.id === envConfig.activeId),
    [envConfig],
  )

  const envVarRows = useMemo(() => {
    const v = activeVars
    const keys = Object.keys(v)
    const sorted = [...keys].sort((a, b) => {
      const pri = (k) => (k === 'baseUrl' ? 0 : k === 'token' ? 1 : 2)
      const d = pri(a) - pri(b)
      return d !== 0 ? d : a.localeCompare(b)
    })
    const dataRows = sorted.map((k) => ({ id: `env-var-${k}`, key: k, value: String(v[k] ?? ''), enabled: true }))
    return dataRows.length ? [...dataRows, emptyRow()] : [emptyRow()]
  }, [activeVars])

  const onEnvVarsChange = useCallback((rows) => {
    const vars = {}
    rows.filter((r) => r.key && r.enabled).forEach((r) => { vars[r.key] = r.value ?? '' })
    updateActiveEnvVars(vars)
  }, [updateActiveEnvVars])

  const addEnvironment = useCallback(() => {
    setEnvConfig((prev) => {
      const n = normalizeApiEnvs(prev)
      const id = uid()
      return {
        ...n,
        environments: [...n.environments, { id, name: `Environment ${n.environments.length + 1}`, vars: { baseUrl: '', token: '' } }],
        activeId: id,
      }
    })
  }, [setEnvConfig])

  const removeEnvironment = useCallback((id) => {
    setEnvConfig((prev) => {
      const n = normalizeApiEnvs(prev)
      if (n.environments.length <= 1) return n
      const environments = n.environments.filter((e) => e.id !== id)
      let activeId = n.activeId
      if (activeId === id) activeId = environments[0].id
      return { ...n, environments, activeId }
    })
  }, [setEnvConfig])

  const renameActiveEnvironment = useCallback((name) => {
    setEnvConfig((prev) => {
      const n = normalizeApiEnvs(prev)
      return {
        ...n,
        environments: n.environments.map((e) => (e.id === n.activeId ? { ...e, name } : e)),
      }
    })
  }, [setEnvConfig])

  const snapshot = useCallback(() => ({
    method, url, params: params.map((p) => ({ ...p })), headers: headers.map((h) => ({ ...h })),
    body, bodyContentType, formDataRows: formDataRows.map((f) => ({ ...f })),
    authType, bearerToken, basicUser, basicPass,
  }), [method, url, params, headers, body, bodyContentType, formDataRows, authType, bearerToken, basicUser, basicPass])

  const loadSnapshot = (s) => {
    setMethod(s.method || 'GET')
    setUrl(s.url || '')
    setParams(s.params?.length ? s.params.map((p) => ({ ...p, id: p.id || uid() })) : [emptyRow()])
    setHeaders(s.headers?.length ? s.headers.map((h) => ({ ...h, id: h.id || uid() })) : [emptyRow()])
    setBody(s.body ?? '')
    setBodyContentType(s.bodyContentType || 'none')
    setFormDataRows(s.formDataRows?.length ? s.formDataRows.map((f) => ({ ...f, id: f.id || uid() })) : [emptyRow()])
    setAuthType(s.authType || 'none')
    setBearerToken(s.bearerToken ?? '')
    setBasicUser(s.basicUser ?? '')
    setBasicPass(s.basicPass ?? '')
  }

  const saveToCollection = () => {
    if (!saveName.trim()) { toast.error('Enter a request name'); return }
    const item = { ...snapshot(), name: saveName.trim(), id: uid(), savedAt: Date.now() }
    setCollections((prev) => [item, ...prev])
    setShowSaveDialog(false)
    setSaveName('')
    toast.success('Request saved')
  }

  const deleteFromCollection = (id) => {
    setCollections((prev) => prev.filter((c) => c.id !== id))
    toast.success('Deleted')
  }

  const buildRequestHeaders = useCallback(() => {
    const h = new Headers()
    headers.filter((r) => r.key && r.enabled).forEach((r) => h.set(r.key, applyEnvPlaceholders(r.value ?? '', activeVars)))
    const hasBody = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) && bodyContentType !== 'none'
    if (hasBody && bodyContentType !== 'multipart/form-data') {
      if (!h.has('Content-Type')) h.set('Content-Type', bodyContentType)
    }
    const bt = applyEnvPlaceholders(bearerToken, activeVars).trim()
    const bu = applyEnvPlaceholders(basicUser, activeVars)
    const bp = applyEnvPlaceholders(basicPass, activeVars)
    if (authType === 'bearer' && bt) h.set('Authorization', `Bearer ${bt}`)
    else if (authType === 'basic' && (bu || bp)) h.set('Authorization', `Basic ${btoa(`${bu}:${bp}`)}`)
    return h
  }, [headers, method, bodyContentType, authType, bearerToken, basicUser, basicPass, activeVars])

  const sendRequest = useCallback(async () => {
    const target = finalUrl.trim()
    if (!target) { toast.error('Enter a URL'); return }

    if (abortRef.current) abortRef.current.abort()
    const controller = new AbortController()
    abortRef.current = controller
    const timeoutId = timeoutSec > 0
      ? setTimeout(() => controller.abort(), timeoutSec * 1000)
      : null

    setLoading(true); setErrorMessage(null); setErrorClassification(null); setCorsHint(false)
    setStatus(null); setStatusText(''); setResponseTimeMs(null)
    setResponseBody(''); setResponseSize(0); setResponseHeaderEntries([])
    setResponseContentType(''); setResTab('body')

    const reqHeaders = buildRequestHeaders()
    const opts = { method, headers: reqHeaders, signal: controller.signal }
    const hasBody = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) && bodyContentType !== 'none'
    if (hasBody) {
      if (bodyContentType === 'application/x-www-form-urlencoded') {
        const urlParams = new URLSearchParams()
        formDataRows.filter((r) => r.key && r.enabled).forEach((r) => urlParams.append(r.key, applyEnvPlaceholders(r.value ?? '', activeVars)))
        opts.body = urlParams.toString()
      } else if (bodyContentType === 'multipart/form-data') {
        const fd = new FormData()
        formDataRows.filter((r) => r.key && r.enabled).forEach((r) => fd.append(r.key, applyEnvPlaceholders(r.value ?? '', activeVars)))
        opts.body = fd
      } else {
        opts.body = applyEnvPlaceholders(body, activeVars)
      }
    }

    const snap = snapshot()
    const t0 = performance.now()

    try {
      const res = await fetch(target, opts)
      if (timeoutId) clearTimeout(timeoutId)
      const elapsed = Math.round(performance.now() - t0)
      setResponseTimeMs(elapsed)
      setStatus(res.status); setStatusText(res.statusText || '')
      const respHeaders = []
      res.headers.forEach((v, k) => respHeaders.push([k, v]))
      respHeaders.sort((a, b) => a[0].localeCompare(b[0]))
      setResponseHeaderEntries(respHeaders)
      const ct = res.headers.get('content-type') || ''
      setResponseContentType(ct)

      const text = await res.text()
      setResponseSize(new Blob([text]).size)
      const isJson = ct.includes('json') || /^\s*[[{]/.test(text)
      setResponseBody(isJson ? prettyJson(text) : text)

      setHistory((prev) => [{ ...snap, id: uid(), sentAt: Date.now(), status: res.status }, ...prev].slice(0, 50))
    } catch (err) {
      if (timeoutId) clearTimeout(timeoutId)
      setResponseTimeMs(Math.round(performance.now() - t0))
      const classified = classifyError(err)
      setErrorMessage(classified.title)
      setErrorClassification(classified)
      setCorsHint(classified.type === 'cors')
      setHistory((prev) => [{ ...snap, id: uid(), sentAt: Date.now(), error: true }, ...prev].slice(0, 50))
    } finally {
      setLoading(false)
      abortRef.current = null
    }
  }, [finalUrl, buildRequestHeaders, method, bodyContentType, formDataRows, body, activeVars, snapshot, setHistory, timeoutSec])

  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault()
        sendRequest()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [sendRequest])

  const importQueryFromUrl = () => {
    if (!url.trim()) return
    setParams(parseQuery(url.trim()))
    setUrl(stripQuery(url.trim()))
    toast.success('Query params imported')
  }

  const resetRequest = () => {
    setMethod('GET'); setUrl(''); setParams([emptyRow()]); setHeaders([emptyRow()])
    setBody(''); setBodyContentType('none'); setFormDataRows([emptyRow()])
    setAuthType('none'); setBearerToken(''); setBasicUser(''); setBasicPass('')
    setStatus(null); setResponseBody(''); setErrorMessage(null); setErrorClassification(null)
    urlInputRef.current?.focus()
  }

  const importFromCurl = useCallback(() => {
    if (!curlInput.trim()) { toast.error('Paste a cURL command'); return }
    const parsed = parseCurl(curlInput)
    if (!parsed.url) { toast.error('Could not find a URL in the cURL command'); return }
    const snap = {
      method: parsed.method,
      url: parsed.url,
      headers: parsed.headers.map((h) => ({ id: uid(), key: h.key, value: h.value, enabled: true })),
      body: parsed.body,
      bodyContentType: parsed.bodyContentType,
      formDataRows: parsed.formDataRows.map((f) => ({ id: uid(), key: f.key, value: f.value, enabled: true })),
      authType: parsed.authType,
      bearerToken: parsed.bearerToken,
      basicUser: parsed.basicUser,
      basicPass: parsed.basicPass,
    }
    loadSnapshot(snap)
    setCurlImportOpen(false)
    setCurlInput('')
    toast.success('Imported from cURL')
  }, [curlInput])

  const handleUrlPaste = useCallback((e) => {
    const pasted = e.clipboardData?.getData('text') || ''
    if (pasted.trim().toLowerCase().startsWith('curl ')) {
      e.preventDefault()
      const parsed = parseCurl(pasted)
      if (parsed.url) {
        const snap = {
          method: parsed.method,
          url: parsed.url,
          headers: parsed.headers.map((h) => ({ id: uid(), key: h.key, value: h.value, enabled: true })),
          body: parsed.body,
          bodyContentType: parsed.bodyContentType,
          formDataRows: parsed.formDataRows.map((f) => ({ id: uid(), key: f.key, value: f.value, enabled: true })),
          authType: parsed.authType,
          bearerToken: parsed.bearerToken,
          basicUser: parsed.basicUser,
          basicPass: parsed.basicPass,
        }
        loadSnapshot(snap)
        toast.success('Imported from cURL')
      }
    }
  }, [])

  const codeSnippet = useMemo(() => {
    if (!codeSnippetLang) return ''
    const target = finalUrl
    const subBody = applyEnvPlaceholders(body, activeVars)
    const bt = applyEnvPlaceholders(bearerToken, activeVars)
    const bu = applyEnvPlaceholders(basicUser, activeVars)
    const bp = applyEnvPlaceholders(basicPass, activeVars)
    if (codeSnippetLang === 'curl') {
      return generateCurl(method, target, resolvedHeadersForCodegen, subBody, bodyContentType, authType, bt, bu, bp)
    }
    if (codeSnippetLang === 'fetch') {
      return generateFetch(method, target, resolvedHeadersForCodegen, subBody, bodyContentType, authType, bt, bu, bp)
    }
    return ''
  }, [codeSnippetLang, method, finalUrl, resolvedHeadersForCodegen, body, bodyContentType, authType, bearerToken, basicUser, basicPass, activeVars])

  const filteredResponseBody = useMemo(() => {
    if (!responseSearch || !responseBody) return null
    try {
      const re = new RegExp(`(${responseSearch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
      const matchCount = (responseBody.match(re) || []).length
      return { matchCount }
    } catch {
      return null
    }
  }, [responseSearch, responseBody])

  const mc = METHOD_COLORS[method] || '#64748B'
  const paramCount = params.filter((p) => p.key && p.enabled).length
  const headerCount = headers.filter((h) => h.key && h.enabled).length

  return (
    <div style={{ fontFamily: 'var(--font-ui)', color: 'var(--text)' }}>
      <ToolHeader toolId="api" title="API Client" description="Build and send HTTP requests">
        <div style={{ display: 'flex', gap: 6 }}>
          <button type="button" onClick={() => setShowSaveDialog(true)} className="forge-btn" style={{ fontSize: 11, padding: '5px 10px', gap: 4 }}>
            <Save size={13} /> Save
          </button>
          <button type="button" onClick={() => setCollectionsOpen((o) => !o)} className="forge-btn" style={{ fontSize: 11, padding: '5px 10px', gap: 4 }}>
            <FolderOpen size={13} /> Collections {collections.length > 0 && <span style={{ background: 'var(--accent)', color: '#fff', borderRadius: 10, padding: '0 5px', fontSize: 10, fontWeight: 700 }}>{collections.length}</span>}
          </button>
          <button type="button" onClick={() => setCodeSnippetLang((l) => l ? null : 'curl')} className="forge-btn" style={{ fontSize: 11, padding: '5px 10px', gap: 4 }}>
            <Code size={13} /> Code
          </button>
          <button type="button" onClick={() => setCurlImportOpen((o) => !o)} className="forge-btn" style={{ fontSize: 11, padding: '5px 10px', gap: 4, borderColor: curlImportOpen ? 'var(--accent)' : undefined }}>
            <Upload size={13} /> Import cURL
          </button>
          <button type="button" onClick={resetRequest} className="forge-btn" style={{ fontSize: 11, padding: '5px 10px', gap: 4 }}>
            <RotateCcw size={13} /> Reset
          </button>
          <button type="button" onClick={() => setEnvPanelOpen((o) => !o)} className="forge-btn" style={{ fontSize: 11, padding: '5px 10px', gap: 4, borderColor: envPanelOpen ? 'var(--accent)' : undefined }}>
            <Layers size={13} /> Environments
          </button>
        </div>
      </ToolHeader>

      {envPanelOpen && (
        <div className="forge-card" style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Environments</div>
            <button type="button" onClick={() => setEnvPanelOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }} aria-label="Close environments">
              <X size={16} />
            </button>
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 12 }}>
            Variables are substituted in the request URL, query params, headers, body, and auth. Use placeholders like{' '}
            <code style={{ fontFamily: 'var(--font-code)', fontSize: 11, background: 'var(--bg)', padding: '2px 6px', borderRadius: 4, border: '1px solid var(--border)' }}>{'{{baseUrl}}'}</code>
            {' '}or{' '}
            <code style={{ fontFamily: 'var(--font-code)', fontSize: 11, background: 'var(--bg)', padding: '2px 6px', borderRadius: 4, border: '1px solid var(--border)' }}>{'{{token}}'}</code>
            {' '}— names match the keys you define below (spacing inside <code style={{ fontFamily: 'var(--font-code)' }}>{'{{ }}'}</code> is allowed).
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', marginBottom: 12 }}>
            <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
              Active
              <select
                value={envConfig.activeId}
                onChange={(e) => setActiveEnvId(e.target.value)}
                style={{ ...inputStyle, padding: '6px 10px', minWidth: 160 }}
              >
                {envConfig.environments.map((e) => (
                  <option key={e.id} value={e.id}>{e.name}</option>
                ))}
              </select>
            </label>
            <button type="button" onClick={addEnvironment} className="forge-btn" style={{ fontSize: 11, padding: '5px 10px', gap: 4 }}>
              <Plus size={13} /> Add environment
            </button>
            {envConfig.environments.length > 1 && (
              <button type="button" onClick={() => removeEnvironment(envConfig.activeId)} className="forge-btn" style={{ fontSize: 11, padding: '5px 10px', gap: 4, color: '#EF4444', borderColor: 'rgba(239,68,68,0.35)' }}>
                <Trash2 size={13} /> Delete current
              </button>
            )}
          </div>
          <div style={{ marginBottom: 12, maxWidth: 420 }}>
            <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Environment name</label>
            <input
              value={currentEnv?.name ?? ''}
              onChange={(e) => renameActiveEnvironment(e.target.value)}
              placeholder="Development"
              style={{ ...inputStyle, width: '100%', padding: '8px 10px', fontSize: 13 }}
            />
          </div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Variables for this environment</div>
          <KVEditor
            rows={envVarRows}
            onChange={onEnvVarsChange}
            onAdd={() => onEnvVarsChange([...envVarRows, emptyRow()])}
            onRemove={(id) => {
              const next = envVarRows.filter((r) => r.id !== id)
              onEnvVarsChange(next.length ? next : [emptyRow()])
            }}
            placeholder={['Key', 'Value']}
          />
        </div>
      )}

      {curlImportOpen && (
        <div className="forge-card" style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Import cURL</div>
            <button type="button" onClick={() => setCurlImportOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }} aria-label="Close import">
              <X size={16} />
            </button>
          </div>
          <textarea
            autoFocus
            value={curlInput}
            onChange={(e) => setCurlInput(e.target.value)}
            placeholder={'Paste a cURL command here, e.g.\ncurl -X POST https://api.example.com/data \\\n  -H \'Content-Type: application/json\' \\\n  -d \'{"key": "value"}\''}
            rows={5}
            style={{ width: '100%', boxSizing: 'border-box', padding: 12, borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontFamily: 'var(--font-code)', fontSize: 12, lineHeight: 1.5, resize: 'vertical', marginBottom: 8 }}
          />
          <button type="button" onClick={importFromCurl} className="forge-btn forge-btn-primary" style={{ fontSize: 12, padding: '8px 16px', gap: 4 }}>
            <Upload size={14} /> Import
          </button>
        </div>
      )}

      {showSaveDialog && (
        <div className="forge-card" style={{ marginBottom: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
          <input autoFocus value={saveName} onChange={(e) => setSaveName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && saveToCollection()}
            placeholder="Request name (e.g. Get Users)" style={{ ...inputStyle, fontSize: 13, padding: '9px 12px' }} />
          <button type="button" onClick={saveToCollection} className="forge-btn forge-btn-primary" style={{ padding: '8px 14px', fontSize: 12, gap: 4, whiteSpace: 'nowrap' }}>
            <Check size={14} /> Save
          </button>
          <button type="button" onClick={() => setShowSaveDialog(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}>
            <X size={16} />
          </button>
        </div>
      )}

      {collectionsOpen && (
        <div className="forge-card" style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Saved Requests</div>
          {collections.length === 0 && <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '8px 0' }}>No saved requests. Click Save to add one.</div>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {collections.map((c) => {
              const cm = METHOD_COLORS[c.method] || '#64748B'
              return (
                <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg)', cursor: 'pointer', transition: 'border-color 0.15s' }}
                  onClick={() => { loadSnapshot(c); setCollectionsOpen(false); toast.success(`Loaded: ${c.name}`) }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = cm}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: `${cm}20`, color: cm, fontFamily: 'var(--font-code)' }}>{c.method}</span>
                  <span style={{ flex: 1, fontSize: 12, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-code)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 200 }}>{c.url}</span>
                  <button type="button" onClick={(e) => { e.stopPropagation(); deleteFromCollection(c.id) }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2, opacity: 0.5 }}>
                    <Trash2 size={12} />
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {codeSnippetLang && (
        <div className="forge-card" style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div className="tab-pills">
              {['curl', 'fetch'].map((lang) => (
                <button key={lang} type="button" className={`tab-pill${codeSnippetLang === lang ? ' active' : ''}`} onClick={() => setCodeSnippetLang(lang)}>{lang}</button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button type="button" onClick={() => copyWithHistory(codeSnippet)} className="forge-btn" style={{ fontSize: 11, padding: '4px 8px', gap: 4 }}>
                <Copy size={12} /> Copy
              </button>
              <button type="button" onClick={() => setCodeSnippetLang(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={14} />
              </button>
            </div>
          </div>
          <pre style={{ margin: 0, padding: 12, borderRadius: 6, background: 'var(--bg)', border: '1px solid var(--border)', fontFamily: 'var(--font-code)', fontSize: 12, lineHeight: 1.5, overflow: 'auto', maxHeight: 200, color: 'var(--text)', whiteSpace: 'pre-wrap' }}>
            {codeSnippet}
          </pre>
        </div>
      )}

      {/* Request Card */}
      <div className="forge-card" style={{ marginBottom: 12 }}>
        {/* Method selector */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 10, flexWrap: 'wrap' }}>
          {METHODS.map((m) => (
            <button key={m} type="button" onClick={() => setMethod(m)} style={methodBadgeStyle(m, method === m)}>{m}</button>
          ))}
        </div>

        {/* URL bar */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <input ref={urlInputRef} type="text" value={url} onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.metaKey && !e.ctrlKey) sendRequest() }}
              onPaste={handleUrlPaste}
              placeholder="https://api.example.com/endpoint  (or paste a cURL command)"
              style={{ width: '100%', padding: '10px 12px', borderRadius: 'var(--radius)', border: `2px solid ${mc}40`, background: 'var(--bg)', color: 'var(--text)', fontFamily: 'var(--font-code)', fontSize: 13, outline: 'none', transition: 'border-color 0.2s' }}
              onFocus={(e) => e.target.style.borderColor = mc}
              onBlur={(e) => e.target.style.borderColor = `${mc}40`} />
          </div>
          <button type="button" onClick={sendRequest} disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 24px', fontWeight: 600, fontSize: 14, background: mc, color: '#fff', border: 'none', borderRadius: 'var(--radius)', cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.7 : 1, transition: 'opacity 0.2s', whiteSpace: 'nowrap', fontFamily: 'var(--font-ui)' }}>
            <Send size={16} />
            {loading ? 'Sending...' : 'Send'}
          </button>
        </div>

        {finalUrl && (finalUrl !== url.trim() || finalUrl !== resolvedUrl) && (
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8, wordBreak: 'break-all', fontFamily: 'var(--font-code)', padding: '4px 8px', background: 'var(--bg)', borderRadius: 4, border: '1px solid var(--border)' }}>
            {finalUrl}
          </div>
        )}

        {/* Request tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 0, borderBottom: '1px solid var(--border)', marginBottom: 12 }}>
          {[
            { id: 'params', label: 'Params', count: paramCount },
            { id: 'headers', label: 'Headers', count: headerCount },
            { id: 'body', label: 'Body' },
            { id: 'auth', label: 'Auth' },
          ].map((tab) => (
            <button key={tab.id} type="button" onClick={() => setReqTab(tab.id)}
              style={{
                padding: '8px 16px', background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 12, fontWeight: reqTab === tab.id ? 600 : 400, fontFamily: 'var(--font-ui)',
                color: reqTab === tab.id ? 'var(--accent)' : 'var(--text-muted)',
                borderBottom: reqTab === tab.id ? `2px solid var(--accent)` : '2px solid transparent',
                transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 4,
              }}>
              {tab.label}
              {tab.count > 0 && <span style={{ fontSize: 10, background: 'var(--accent)', color: '#fff', borderRadius: 10, padding: '0 5px', fontWeight: 700 }}>{tab.count}</span>}
            </button>
          ))}
        </div>

        {/* Params tab */}
        {reqTab === 'params' && (
          <div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
              <button type="button" onClick={importQueryFromUrl} className="forge-btn" style={{ fontSize: 11, padding: '4px 8px' }}>Import from URL</button>
              <button type="button" onClick={() => setBulkEditParams((b) => !b)} className="forge-btn" style={{ fontSize: 11, padding: '4px 8px' }}>
                {bulkEditParams ? 'Key-Value' : 'Bulk Edit'}
              </button>
            </div>
            {bulkEditParams ? (
              <BulkEditor value={rowsToBulk(params)} onChange={(text) => setParams(bulkToRows(text))} placeholder="key: value (one per line, prefix with // to disable)" />
            ) : (
              <KVEditor rows={params} onChange={setParams}
                onAdd={() => setParams((p) => [...p, emptyRow()])}
                onRemove={(id) => setParams((p) => p.length <= 1 ? p : p.filter((r) => r.id !== id))}
                placeholder={['Key', 'Value']} />
            )}
          </div>
        )}

        {/* Headers tab */}
        {reqTab === 'headers' && (
          <div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
              <button type="button" onClick={() => setBulkEditHeaders((b) => !b)} className="forge-btn" style={{ fontSize: 11, padding: '4px 8px' }}>
                {bulkEditHeaders ? 'Key-Value' : 'Bulk Edit'}
              </button>
            </div>
            {bulkEditHeaders ? (
              <BulkEditor value={rowsToBulk(headers)} onChange={(text) => setHeaders(bulkToRows(text))} placeholder="Header-Name: value (one per line, prefix with // to disable)" />
            ) : (
              <KVEditor rows={headers} onChange={setHeaders}
                onAdd={() => setHeaders((h) => [...h, emptyRow()])}
                onRemove={(id) => setHeaders((h) => h.length <= 1 ? h : h.filter((r) => r.id !== id))}
                placeholder={['Header', 'Value']}
                suggestions={COMMON_HEADERS} />
            )}
          </div>
        )}

        {/* Body tab */}
        {reqTab === 'body' && (
          <div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
              {BODY_TYPES.map((bt) => (
                <button key={bt.value} type="button" onClick={() => setBodyContentType(bt.value)}
                  style={{
                    padding: '5px 12px', fontSize: 11, borderRadius: 6, cursor: 'pointer', fontFamily: 'var(--font-ui)',
                    border: bodyContentType === bt.value ? '1px solid var(--accent)' : '1px solid var(--border)',
                    background: bodyContentType === bt.value ? 'color-mix(in srgb, var(--accent) 10%, var(--bg))' : 'var(--bg)',
                    color: bodyContentType === bt.value ? 'var(--accent)' : 'var(--text-muted)', fontWeight: bodyContentType === bt.value ? 600 : 400,
                  }}>
                  {bt.label}
                </button>
              ))}
            </div>
            {bodyContentType === 'none' && (
              <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>This request does not have a body</div>
            )}
            {bodyContentType !== 'none' && bodyContentType !== 'application/x-www-form-urlencoded' && bodyContentType !== 'multipart/form-data' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 4 }}>
                  {bodyContentType === 'application/json' && (
                    <button type="button" onClick={() => setBody(prettyJson(body))} className="forge-btn" style={{ fontSize: 10, padding: '3px 8px' }}>Beautify</button>
                  )}
                </div>
                <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder={bodyContentType === 'application/json' ? '{\n  "key": "value"\n}' : 'Request body...'}
                  rows={14} style={{ width: '100%', boxSizing: 'border-box', padding: 12, borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontFamily: 'var(--font-code)', fontSize: 12, lineHeight: 1.5, resize: 'vertical' }} />
              </div>
            )}
            {(bodyContentType === 'application/x-www-form-urlencoded' || bodyContentType === 'multipart/form-data') && (
              <KVEditor rows={formDataRows} onChange={setFormDataRows}
                onAdd={() => setFormDataRows((f) => [...f, emptyRow()])}
                onRemove={(id) => setFormDataRows((f) => f.length <= 1 ? f : f.filter((r) => r.id !== id))}
                placeholder={['Key', 'Value']} />
            )}
          </div>
        )}

        {/* Auth tab */}
        {reqTab === 'auth' && (
          <div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
              {[{ id: 'none', label: 'No Auth' }, { id: 'bearer', label: 'Bearer Token' }, { id: 'basic', label: 'Basic Auth' }].map((a) => (
                <button key={a.id} type="button" onClick={() => setAuthType(a.id)}
                  style={{
                    padding: '6px 14px', fontSize: 12, borderRadius: 6, cursor: 'pointer',
                    border: authType === a.id ? '1px solid var(--accent)' : '1px solid var(--border)',
                    background: authType === a.id ? 'color-mix(in srgb, var(--accent) 10%, var(--bg))' : 'var(--bg)',
                    color: authType === a.id ? 'var(--accent)' : 'var(--text-muted)', fontWeight: authType === a.id ? 600 : 400,
                  }}>
                  {a.label}
                </button>
              ))}
            </div>
            {authType === 'bearer' && (
              <div style={{ maxWidth: 500 }}>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Token</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input type={showPassword ? 'text' : 'password'} autoComplete="off" value={bearerToken} onChange={(e) => setBearerToken(e.target.value)}
                    placeholder="eyJhbGciOiJIUzI1NiIs..." style={{ ...inputStyle, flex: 1, padding: '10px 12px', fontSize: 13 }} />
                  <button type="button" onClick={() => setShowPassword((s) => !s)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 6 }}>
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            )}
            {authType === 'basic' && (
              <div style={{ maxWidth: 500, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Username</label>
                  <input value={basicUser} onChange={(e) => setBasicUser(e.target.value)} placeholder="username" style={{ ...inputStyle, padding: '10px 12px', fontSize: 13, width: '100%' }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Password</label>
                  <input type="password" autoComplete="off" value={basicPass} onChange={(e) => setBasicPass(e.target.value)} placeholder="password" style={{ ...inputStyle, padding: '10px 12px', fontSize: 13, width: '100%' }} />
                </div>
              </div>
            )}
            {authType === 'none' && <div style={{ padding: '16px 0', color: 'var(--text-muted)', fontSize: 13 }}>No authentication will be sent with this request.</div>}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, fontSize: 10, color: 'var(--text-muted)', opacity: 0.5 }}>
          <span>Press <kbd style={{ padding: '1px 4px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 3, fontFamily: 'var(--font-code)' }}>⌘ Enter</kbd> to send</span>
          <label style={{ display: 'flex', alignItems: 'center', gap: 4, opacity: 1 }}>
            Timeout
            <input
              type="number"
              min={0}
              max={300}
              value={timeoutSec}
              onChange={(e) => setTimeoutSec(Math.max(0, Math.min(300, Number(e.target.value) || 0)))}
              style={{ width: 44, padding: '2px 4px', fontSize: 10, fontFamily: 'var(--font-code)', color: 'var(--text)', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 3, textAlign: 'center' }}
            />s
          </label>
        </div>
      </div>

      {/* Response Card */}
      <div className="forge-card" style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 10 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Response</span>
            {status != null && (
              <span style={{ fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-code)', color: statusColor(status), display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: statusColor(status), display: 'inline-block' }} />
                {status} <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: 12 }}>{statusText}</span>
              </span>
            )}
            {responseTimeMs != null && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-code)' }}>
                <Clock size={12} /> {responseTimeMs}ms
              </span>
            )}
            {responseSize > 0 && (
              <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-code)' }}>
                {formatBytes(responseSize)}
              </span>
            )}
          </div>
          <button type="button" onClick={() => copyWithHistory(errorMessage || responseBody)} className="forge-btn" style={{ fontSize: 11, padding: '4px 8px', gap: 4 }}>
            <Copy size={12} /> Copy
          </button>
        </div>

        {errorMessage && (
          <div style={{ display: 'flex', gap: 10, padding: 12, marginBottom: 10, borderRadius: 6, border: '1px solid rgba(239,68,68,0.35)', background: 'rgba(239,68,68,0.06)' }}>
            <AlertCircle size={18} style={{ flexShrink: 0, color: '#EF4444', marginTop: 1 }} />
            <div style={{ fontSize: 12, lineHeight: 1.5, flex: 1 }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>{errorMessage}</div>
              {errorClassification?.detail && (
                <div style={{ color: 'var(--text-muted)', marginBottom: 8 }}>{errorClassification.detail}</div>
              )}
              <button type="button" onClick={sendRequest} className="forge-btn" style={{ fontSize: 11, padding: '4px 10px', gap: 4 }}>
                <RefreshCw size={12} /> Retry
              </button>
            </div>
          </div>
        )}

        {/* Response tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 0, borderBottom: '1px solid var(--border)', marginBottom: 10 }}>
          {['body', 'headers'].map((tab) => (
            <button key={tab} type="button" onClick={() => setResTab(tab)}
              style={{
                padding: '7px 16px', background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 12, fontWeight: resTab === tab ? 600 : 400,
                color: resTab === tab ? 'var(--accent)' : 'var(--text-muted)',
                borderBottom: resTab === tab ? '2px solid var(--accent)' : '2px solid transparent',
                textTransform: 'capitalize',
              }}>
              {tab} {tab === 'headers' && responseHeaderEntries.length > 0 && <span style={{ fontSize: 10, opacity: 0.6 }}>({responseHeaderEntries.length})</span>}
            </button>
          ))}
        </div>

        {resTab === 'body' && (
          <div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 8, alignItems: 'center' }}>
              {responseBody && responseContentType.includes('json') && (
                <button type="button" onClick={() => setResponseRaw((r) => !r)} className="forge-btn" style={{ fontSize: 10, padding: '3px 8px' }}>
                  {responseRaw ? 'Pretty' : 'Raw'}
                </button>
              )}
              {responseBody && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 'auto' }}>
                  <Search size={12} style={{ color: 'var(--text-muted)' }} />
                  <input value={responseSearch} onChange={(e) => setResponseSearch(e.target.value)} placeholder="Search response..."
                    style={{ width: 160, padding: '3px 8px', fontSize: 11, borderRadius: 4, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontFamily: 'var(--font-code)' }} />
                  {filteredResponseBody && <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{filteredResponseBody.matchCount} match{filteredResponseBody.matchCount !== 1 ? 'es' : ''}</span>}
                </div>
              )}
            </div>
            <pre style={{ margin: 0, padding: 12, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg)', fontFamily: 'var(--font-code)', fontSize: 12, lineHeight: 1.55, overflow: 'auto', maxHeight: 500, whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: 'var(--text)' }}>
              {errorMessage ? '' : responseRaw ? responseBody : (responseBody || (status != null ? '(empty body)' : 'Send a request to see the response'))}
            </pre>
          </div>
        )}

        {resTab === 'headers' && (
          <div style={{ borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg)', maxHeight: 400, overflow: 'auto' }}>
            {responseHeaderEntries.length === 0 ? (
              <div style={{ padding: 12, color: 'var(--text-muted)', fontSize: 12 }}>No response yet</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, fontFamily: 'var(--font-code)' }}>
                <tbody>
                  {responseHeaderEntries.map(([k, v]) => (
                    <tr key={k} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '7px 12px', color: 'var(--accent)', verticalAlign: 'top', whiteSpace: 'nowrap', fontWeight: 500 }}>{k}</td>
                      <td style={{ padding: '7px 12px', color: 'var(--text)', wordBreak: 'break-all' }}>{v}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* History */}
      <div className="forge-card">
        <button type="button" onClick={() => setHistoryOpen((o) => !o)}
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text)', fontWeight: 600, fontSize: 13, fontFamily: 'var(--font-ui)' }}>
          <span>History <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: 11 }}>({history.length})</span></span>
          {historyOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        {historyOpen && (
          <div style={{ marginTop: 8 }}>
            {history.length === 0 && <div style={{ color: 'var(--text-muted)', fontSize: 12, padding: '8px 0' }}>No requests yet</div>}
            {history.length > 0 && (
              <>
                <div ref={historyScrollRef} style={{ maxHeight: 280, overflow: 'auto', marginBottom: 4 }}>
                  <div style={{ height: historyVirtualizer.getTotalSize(), position: 'relative', width: '100%' }}>
                    {historyVirtualizer.getVirtualItems().map((vi) => {
                      const h = history[vi.index]
                      const hc = METHOD_COLORS[h.method] || '#64748B'
                      const sc = h.status ? statusColor(h.status) : (h.error ? '#EF4444' : 'var(--text-muted)')
                      return (
                        <button
                          key={h.id || h.sentAt}
                          type="button"
                          onClick={() => { loadSnapshot(h); toast.success('Request loaded') }}
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: vi.size,
                            transform: `translateY(${vi.start}px)`,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            padding: '7px 10px',
                            textAlign: 'left',
                            border: '1px solid var(--border)',
                            borderRadius: 6,
                            background: 'var(--bg)',
                            cursor: 'pointer',
                            boxSizing: 'border-box',
                            transition: 'border-color 0.15s',
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.borderColor = hc }}
                          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)' }}
                        >
                          <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 5px', borderRadius: 3, background: `${hc}20`, color: hc, fontFamily: 'var(--font-code)', flexShrink: 0 }}>{h.method}</span>
                          <span style={{ flex: 1, fontSize: 11, fontFamily: 'var(--font-code)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text)' }}>
                            {buildUrl(h.url, h.params || [])}
                          </span>
                          {h.status ? <span style={{ fontSize: 10, fontWeight: 600, color: sc, fontFamily: 'var(--font-code)', flexShrink: 0 }}>{h.status}</span> : null}
                          {h.error ? <AlertCircle size={12} style={{ color: '#EF4444', flexShrink: 0 }} /> : null}
                          <span style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: 'var(--font-code)', flexShrink: 0 }}>
                            {h.sentAt ? new Date(h.sentAt).toLocaleTimeString() : ''}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
                <button type="button" onClick={() => { setHistory([]); toast.success('History cleared') }}
                  style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 0', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 11, marginTop: 4 }}>
                  <Trash2 size={12} /> Clear history
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
