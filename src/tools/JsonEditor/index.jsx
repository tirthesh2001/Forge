import { useState, useCallback, useRef, useMemo, useEffect } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { json } from '@codemirror/lang-json'
import { oneDark } from '@codemirror/theme-one-dark'
import {
  AlignLeft, Minimize2, Copy, Trash2,
  ChevronRight, ChevronDown, FileJson, Wand2, Search,
} from 'lucide-react'
import toast from 'react-hot-toast'
import useCloudState from '../../hooks/useCloudState'
import ToolHeader from '../../components/ToolHeader'
import { copyWithHistory } from '../../utils/copyWithHistory'
import DropZone from '../../components/DropZone'

const SAMPLE = `{
  "name": "Forge",
  "version": "1.0.0",
  "tools": ["QR", "JSON", "Diff", "CSV", "Color"]
}`

function TreeNode({ name, value, depth = 0, expandedKeys, toggleKey, path }) {
  const key = path
  const isObject = value !== null && typeof value === 'object'
  const isArray = Array.isArray(value)
  const expanded = expandedKeys.has(key)

  if (!isObject) {
    let color = 'var(--text-muted)'
    let display = String(value)
    if (typeof value === 'string') { color = '#22C55E'; display = `"${value}"` }
    else if (typeof value === 'number') { color = '#EAB308' }
    else if (typeof value === 'boolean') { color = '#F97316' }
    else if (value === null) { color = 'var(--text-muted)'; display = 'null' }

    return (
      <div
        className="flex gap-1 items-baseline transition-colors duration-100"
        style={{
          paddingLeft: depth * 20,
          fontSize: 13,
          lineHeight: '1.8',
          paddingTop: 1,
          paddingBottom: 1,
          borderRadius: 4,
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-hover)' }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
      >
        {depth > 0 && <div style={{ position: 'absolute', left: depth * 20 - 10, top: 0, bottom: 0, borderLeft: '1px dashed var(--border)' }} />}
        {name !== undefined && (
          <span style={{ color: 'var(--accent)', fontFamily: 'var(--font-code)' }}>
            {typeof name === 'string' ? `"${name}"` : name}
            <span style={{ color: 'var(--text-muted)' }}>: </span>
          </span>
        )}
        <span style={{ color, fontFamily: 'var(--font-code)' }}>{display}</span>
      </div>
    )
  }

  const entries = isArray ? value.map((v, i) => [i, v]) : Object.entries(value)

  return (
    <div style={{ position: 'relative' }}>
      {depth > 0 && (
        <div style={{
          position: 'absolute', left: depth * 20 - 10,
          top: 0, bottom: 0, borderLeft: '1px dashed var(--border)',
          pointerEvents: 'none',
        }} />
      )}
      <div
        className="flex items-center gap-1 cursor-pointer select-none transition-colors duration-100"
        style={{ paddingLeft: depth * 20, fontSize: 13, lineHeight: '1.8', borderRadius: 4 }}
        onClick={() => toggleKey(key)}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-hover)' }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
      >
        {expanded
          ? <ChevronDown size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          : <ChevronRight size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
        }
        {name !== undefined && (
          <span style={{ color: 'var(--accent)', fontFamily: 'var(--font-code)' }}>
            {typeof name === 'string' ? `"${name}"` : name}
            <span style={{ color: 'var(--text-muted)' }}>: </span>
          </span>
        )}
        <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-code)' }}>
          {isArray ? `Array[${entries.length}]` : `Object{${entries.length}}`}
        </span>
      </div>
      {expanded && entries.map(([k, v]) => (
        <TreeNode
          key={`${key}.${k}`}
          name={k} value={v} depth={depth + 1}
          expandedKeys={expandedKeys} toggleKey={toggleKey}
          path={`${key}.${k}`}
        />
      ))}
    </div>
  )
}

function jsonTypeOf(instance) {
  if (instance === null) return 'null'
  if (Array.isArray(instance)) return 'array'
  return typeof instance
}

function instanceMatchesType(instance, t) {
  if (t === 'integer') return typeof instance === 'number' && Number.isInteger(instance)
  if (t === 'number') return typeof instance === 'number' && !Number.isNaN(instance)
  if (t === 'null') return instance === null
  if (t === 'array') return Array.isArray(instance)
  if (t === 'object') return instance !== null && typeof instance === 'object' && !Array.isArray(instance)
  if (t === 'string') return typeof instance === 'string'
  if (t === 'boolean') return typeof instance === 'boolean'
  return jsonTypeOf(instance) === t
}

function validateAgainstSchema(instance, schema, path) {
  const errors = []
  if (!schema || typeof schema !== 'object' || Array.isArray(schema)) return errors

  const { type: schemaType, required, properties, items, enum: enumList, minimum, maximum, minLength, maxLength, pattern } = schema

  if (enumList) {
    const ok = enumList.some((e) => JSON.stringify(e) === JSON.stringify(instance))
    if (!ok) errors.push({ path: path || '/', message: 'Value must be one of enum' })
    return errors
  }

  if (schemaType !== undefined) {
    const types = Array.isArray(schemaType) ? schemaType : [schemaType]
    const ok = types.some((t) => instanceMatchesType(instance, t))
    if (!ok) {
      errors.push({ path: path || '/', message: `Expected type ${types.join(' | ')}, got ${jsonTypeOf(instance)}` })
      return errors
    }
  }

  if (typeof instance === 'number') {
    if (minimum !== undefined && instance < minimum) errors.push({ path: path || '/', message: `Must be >= ${minimum}` })
    if (maximum !== undefined && instance > maximum) errors.push({ path: path || '/', message: `Must be <= ${maximum}` })
  }

  if (typeof instance === 'string') {
    if (minLength !== undefined && instance.length < minLength) errors.push({ path: path || '/', message: `String length must be >= ${minLength}` })
    if (maxLength !== undefined && instance.length > maxLength) errors.push({ path: path || '/', message: `String length must be <= ${maxLength}` })
    if (pattern) {
      try {
        const re = new RegExp(pattern)
        if (!re.test(instance)) errors.push({ path: path || '/', message: 'String does not match pattern' })
      } catch {
        errors.push({ path: path || '/', message: 'Invalid pattern in schema' })
      }
    }
  }

  if (instance !== null && typeof instance === 'object' && !Array.isArray(instance) && properties) {
    const req = Array.isArray(required) ? required : []
    for (const r of req) {
      if (!(r in instance)) errors.push({ path: `${path}/${r}`, message: 'Required property missing' })
    }
    for (const [k, subSchema] of Object.entries(properties)) {
      if (Object.prototype.hasOwnProperty.call(instance, k)) {
        errors.push(...validateAgainstSchema(instance[k], subSchema, `${path}/${k}`))
      }
    }
  }

  if (Array.isArray(instance) && items) {
    instance.forEach((el, i) => {
      errors.push(...validateAgainstSchema(el, items, `${path}/${i}`))
    })
  }

  return errors
}

function capitalizeSeg(s) {
  const t = String(s).replace(/[^a-zA-Z0-9]+(.)/g, (_, c) => c.toUpperCase())
  return t.charAt(0).toUpperCase() + t.slice(1)
}

function primitiveTs(v) {
  if (v === null) return 'null'
  if (typeof v === 'string') return 'string'
  if (typeof v === 'number') return 'number'
  if (typeof v === 'boolean') return 'boolean'
  return 'unknown'
}

function toTypeScript(value) {
  const interfaces = []
  function visitObject(obj, pathParts) {
    const name = pathParts.length === 0 ? 'Root' : `Root${pathParts.map(capitalizeSeg).join('')}`
    const fieldLines = []
    for (const [k, v] of Object.entries(obj)) {
      const prop = /^[a-zA-Z_$][\w$]*$/.test(k) ? k : `'${k}'`
      if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
        const childName = visitObject(v, [...pathParts, k])
        fieldLines.push(`  ${prop}: ${childName};`)
      } else if (Array.isArray(v)) {
        if (v.length === 0) fieldLines.push(`  ${prop}: unknown[];`)
        else {
          const el = v[0]
          if (el !== null && typeof el === 'object' && !Array.isArray(el)) {
            const itemName = visitObject(el, [...pathParts, k, 'Item'])
            fieldLines.push(`  ${prop}: ${itemName}[];`)
          } else {
            fieldLines.push(`  ${prop}: ${primitiveTs(el)}[];`)
          }
        }
      } else {
        fieldLines.push(`  ${prop}: ${primitiveTs(v)};`)
      }
    }
    interfaces.push(`export interface ${name} {\n${fieldLines.join('\n')}\n}`)
    return name
  }

  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return `export type Root = ${Array.isArray(value) ? `${primitiveTs(value[0] ?? null)}[]` : primitiveTs(value)};\n`
  }
  visitObject(value, [])
  return interfaces.join('\n\n')
}

function escapeGoTag(k) {
  return String(k).replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

function goFieldKey(key) {
  const p = String(key).split(/[^a-zA-Z0-9]+/).filter(Boolean)
  if (p.length === 0) return 'Field'
  return p.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join('')
}

function goPrimitive(v) {
  if (v === null) return 'interface{}'
  if (typeof v === 'boolean') return 'bool'
  if (typeof v === 'number') return Number.isInteger(v) ? 'int' : 'float64'
  if (typeof v === 'string') return 'string'
  return 'interface{}'
}

function emitGoStructBody(obj, indent) {
  const pad = '\t'.repeat(indent)
  const lines = []
  for (const [k, v] of Object.entries(obj)) {
    const fk = goFieldKey(k)
    const tag = escapeGoTag(k)
    if (v === null) {
      lines.push(`${pad}${fk} interface{} \`json:"${tag}"\``)
    } else if (Array.isArray(v)) {
      if (v.length === 0) {
        lines.push(`${pad}${fk} []interface{} \`json:"${tag}"\``)
      } else {
        const el = v[0]
        if (el !== null && typeof el === 'object' && !Array.isArray(el)) {
          const inner = emitGoStructBody(el, indent + 1)
          lines.push(`${pad}${fk} []struct {\n${inner}\n${pad}} \`json:"${tag}"\``)
        } else {
          lines.push(`${pad}${fk} []${goPrimitive(el)} \`json:"${tag}"\``)
        }
      }
    } else if (typeof v === 'object') {
      const inner = emitGoStructBody(v, indent + 1)
      lines.push(`${pad}${fk} struct {\n${inner}\n${pad}} \`json:"${tag}"\``)
    } else {
      lines.push(`${pad}${fk} ${goPrimitive(v)} \`json:"${tag}"\``)
    }
  }
  return lines.join('\n')
}

function toGoStruct(value) {
  if (value === null || typeof value !== 'object') {
    return `type Root ${goPrimitive(value)}\n`
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return 'type Root []interface{}\n'
    const el = value[0]
    if (el !== null && typeof el === 'object' && !Array.isArray(el)) {
      return `type Root []struct {\n${emitGoStructBody(el, 1)}\n}\n`
    }
    return `type Root []${goPrimitive(el)}\n`
  }
  return `type Root struct {\n${emitGoStructBody(value, 1)}\n}\n`
}

function parseJsonPathExpression(expr) {
  const s = String(expr).trim()
  if (!s.startsWith('$')) throw new Error('Expression must start with $')
  let i = 1
  const segments = []
  while (i < s.length) {
    if (s[i] === '.') {
      i += 1
      const rest = s.slice(i)
      const m = rest.match(/^([a-zA-Z_][\w$]*)/)
      if (!m) throw new Error('Expected property name after .')
      segments.push({ type: 'prop', name: m[1] })
      i += m[1].length
    } else if (s[i] === '[') {
      i += 1
      if (s.slice(i, i + 2) === '*]') {
        segments.push({ type: 'wildcard' })
        i += 2
      } else {
        const m = s.slice(i).match(/^(\d+)\]/)
        if (!m) throw new Error('Expected index or *]')
        segments.push({ type: 'index', index: parseInt(m[1], 10) })
        i += m[1].length + 1
      }
    } else {
      throw new Error(`Unexpected character at position ${i}`)
    }
  }
  return segments
}

function evalJsonPath(data, segments) {
  let current = [data]
  for (const seg of segments) {
    if (seg.type === 'prop') {
      current = current.flatMap((v) => {
        if (v !== null && typeof v === 'object' && !Array.isArray(v) && Object.prototype.hasOwnProperty.call(v, seg.name)) return [v[seg.name]]
        return []
      })
    } else if (seg.type === 'index') {
      current = current.flatMap((v) => {
        if (Array.isArray(v) && v[seg.index] !== undefined) return [v[seg.index]]
        return []
      })
    } else if (seg.type === 'wildcard') {
      current = current.flatMap((v) => (Array.isArray(v) ? v : []))
    }
  }
  return current
}

export default function JsonEditor() {
  const [code, setCode] = useCloudState('json-code', SAMPLE)
  const [validation, setValidation] = useState(() => { try { JSON.parse(code); return { valid: true, message: 'Valid JSON' } } catch (e) { return { valid: false, message: e.message } } })
  const [parsed, setParsed] = useState(() => { try { return JSON.parse(code) } catch { return null } })
  const [expandedKeys, setExpandedKeys] = useState(new Set(['root']))

  const [schemaOpen, setSchemaOpen] = useState(false)
  const [schemaText, setSchemaText] = useState('{}')
  const [convertOpen, setConvertOpen] = useState(false)
  const [convertKind, setConvertKind] = useState(null)
  const [jsonPathInput, setJsonPathInput] = useState('')
  const convertRef = useRef(null)

  const validate = useCallback((val) => {
    try {
      const obj = JSON.parse(val)
      setValidation({ valid: true, message: 'Valid JSON' })
      setParsed(obj)
    } catch (e) {
      setValidation({ valid: false, message: e.message })
      setParsed(null)
    }
  }, [])

  const handleChange = useCallback((val) => { setCode(val); validate(val) }, [validate, setCode])

  const toggleKey = useCallback((key) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }, [])

  const format = useCallback(() => {
    try { const f = JSON.stringify(JSON.parse(code), null, 2); setCode(f); validate(f); toast.success('Formatted') }
    catch { toast.error('Cannot format invalid JSON') }
  }, [code, validate, setCode])

  const minify = useCallback(() => {
    try { const m = JSON.stringify(JSON.parse(code)); setCode(m); validate(m); toast.success('Minified') }
    catch { toast.error('Cannot minify invalid JSON') }
  }, [code, validate, setCode])

  const copyJson = useCallback(() => { copyWithHistory(code) }, [code])

  const clear = useCallback(() => { setCode(''); setParsed(null); setValidation({ valid: true, message: '' }) }, [setCode])

  const loadFileText = useCallback((file) => {
    if (file.size > 5 * 1024 * 1024) {
      toast('Large file detected. Processing may take a moment.', { icon: '⚠️' })
    }
    const reader = new FileReader()
    reader.onload = (ev) => { const t = ev.target.result; setCode(t); validate(t) }
    reader.readAsText(file)
  }, [validate, setCode])

  const schemaErrors = useMemo(() => {
    if (!schemaOpen) return []
    let schemaObj
    try {
      schemaObj = JSON.parse(schemaText)
    } catch (e) {
      return [{ path: '(schema)', message: `Invalid JSON Schema: ${e.message}` }]
    }
    if (!validation.valid || parsed === null) {
      return [{ path: '(data)', message: 'Fix JSON document before validating against schema' }]
    }
    return validateAgainstSchema(parsed, schemaObj, '')
  }, [schemaOpen, schemaText, validation.valid, parsed])

  const jsonPathResults = useMemo(() => {
    const q = jsonPathInput.trim()
    if (!q) return { error: null, values: [] }
    if (!validation.valid || parsed === null) {
      return { error: 'Valid JSON required', values: [] }
    }
    try {
      const segs = parseJsonPathExpression(q)
      const values = evalJsonPath(parsed, segs)
      return { error: null, values }
    } catch (e) {
      return { error: e.message, values: [] }
    }
  }, [jsonPathInput, validation.valid, parsed])

  const convertOutput = useMemo(() => {
    if (!convertKind || !validation.valid || parsed === null) return ''
    try {
      if (convertKind === 'ts') return toTypeScript(parsed)
      if (convertKind === 'go') return toGoStruct(parsed)
    } catch {
      return ''
    }
    return ''
  }, [convertKind, validation.valid, parsed])

  useEffect(() => {
    function handleClick(e) {
      if (convertRef.current && !convertRef.current.contains(e.target)) setConvertOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const copyConvert = useCallback(() => {
    if (!convertOutput) return
    copyWithHistory(convertOutput)
  }, [convertOutput])

  return (
    <div>
      <ToolHeader toolId="json" title="JSON Editor" description="Edit, validate, format, and explore JSON data" />

      <div className="forge-toolbar" style={{ flexWrap: 'wrap', gap: 8 }}>
        <button type="button" onClick={format} className="forge-btn"><AlignLeft size={13} /> Format</button>
        <button type="button" onClick={minify} className="forge-btn"><Minimize2 size={13} /> Minify</button>
        <div className="divider" />
        <button type="button" onClick={copyJson} className="forge-btn"><Copy size={13} /> Copy</button>
        <div className="divider" />
        <button
          type="button"
          onClick={() => setSchemaOpen((o) => !o)}
          className={`forge-btn tab-pill${schemaOpen ? ' active' : ''}`}
        >
          <FileJson size={13} /> Schema
        </button>
        <div className="relative" ref={convertRef}>
          <button
            type="button"
            onClick={() => setConvertOpen((o) => !o)}
            className="forge-btn"
          >
            <Wand2 size={13} /> Convert <ChevronDown size={13} />
          </button>
          {convertOpen && (
            <div
              className="forge-card"
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                marginTop: 6,
                zIndex: 30,
                minWidth: 180,
                padding: 6,
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                background: 'var(--surface)',
                boxShadow: '0 8px 24px color-mix(in srgb, var(--bg) 40%, black)',
              }}
            >
              <button
                type="button"
                className="forge-btn"
                style={{ width: '100%', justifyContent: 'flex-start' }}
                onClick={() => { setConvertKind('ts'); setConvertOpen(false) }}
              >
                To TypeScript
              </button>
              <button
                type="button"
                className="forge-btn"
                style={{ width: '100%', justifyContent: 'flex-start' }}
                onClick={() => { setConvertKind('go'); setConvertOpen(false) }}
              >
                To Go Struct
              </button>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2" style={{ flex: '1 1 200px', minWidth: 0, marginLeft: 8 }}>
          <Search size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          <input
            type="text"
            value={jsonPathInput}
            onChange={(e) => setJsonPathInput(e.target.value)}
            placeholder="JSONPath e.g. $.tools[0] or $.array[*].field"
            className="forge-btn"
            style={{
              flex: 1,
              minWidth: 0,
              cursor: 'text',
              fontFamily: 'var(--font-code)',
              fontSize: 12,
              textAlign: 'left',
              justifyContent: 'flex-start',
            }}
          />
        </div>
        <button type="button" onClick={clear} className="forge-btn"><Trash2 size={13} /> Clear</button>
      </div>

      {schemaOpen && (
        <div
          className="forge-card"
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 12,
            marginBottom: 16,
            padding: 12,
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            background: 'var(--surface)',
          }}
        >
          <div className="flex flex-col" style={{ minWidth: 0 }}>
            <div className="text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-ui)' }}>
              JSON Schema
            </div>
            <textarea
              value={schemaText}
              onChange={(e) => setSchemaText(e.target.value)}
              spellCheck={false}
              style={{
                width: '100%',
                minHeight: 160,
                flex: 1,
                padding: 12,
                fontSize: 12,
                fontFamily: 'var(--font-code)',
                background: 'var(--bg)',
                color: 'var(--text)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                resize: 'vertical',
              }}
            />
          </div>
          <div className="flex flex-col" style={{ minWidth: 0 }}>
            <div className="text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-ui)' }}>
              Validation
            </div>
            <ul
              className="overflow-auto text-xs"
              style={{
                margin: 0,
                padding: '8px 12px',
                listStyle: 'none',
                minHeight: 160,
                maxHeight: 240,
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                fontFamily: 'var(--font-code)',
              }}
            >
              {schemaErrors.length === 0 ? (
                <li style={{ color: '#22C55E' }}>No errors</li>
              ) : (
                schemaErrors.map((err, idx) => (
                  <li key={idx} style={{ color: '#F87171', marginBottom: 8, lineHeight: 1.5 }}>
                    <span style={{ color: 'var(--text-muted)' }}>{err.path}</span>
                    {' — '}
                    {err.message}
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      )}

      {(jsonPathInput.trim() || jsonPathResults.error) && (
        <div
          className="forge-card"
          style={{
            marginBottom: 16,
            padding: 12,
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            background: 'var(--surface)',
          }}
        >
          <div className="text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-ui)' }}>
            JSONPath results
          </div>
          {jsonPathResults.error ? (
            <div style={{ color: '#F87171', fontSize: 12, fontFamily: 'var(--font-code)' }}>{jsonPathResults.error}</div>
          ) : (
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, fontFamily: 'var(--font-code)', color: 'var(--text)' }}>
              {jsonPathResults.values.length === 0 ? (
                <li style={{ color: 'var(--text-muted)' }}>No matches</li>
              ) : (
                jsonPathResults.values.map((v, i) => (
                  <li key={i} style={{ marginBottom: 6, wordBreak: 'break-all' }}>
                    {JSON.stringify(v)}
                  </li>
                ))
              )}
            </ul>
          )}
        </div>
      )}

      {convertKind && (
        <div
          className="forge-card"
          style={{
            marginBottom: 16,
            padding: 12,
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            background: 'var(--surface)',
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-ui)' }}>
              {convertKind === 'ts' ? 'TypeScript' : 'Go struct'}
            </span>
            <button type="button" className="forge-btn" onClick={copyConvert} disabled={!convertOutput}>
              <Copy size={13} /> Copy
            </button>
          </div>
          <pre
            style={{
              margin: 0,
              padding: 12,
              maxHeight: 280,
              overflow: 'auto',
              fontSize: 12,
              fontFamily: 'var(--font-code)',
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              color: 'var(--text)',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {convertOutput || (validation.valid ? '' : 'Valid JSON required')}
          </pre>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 16, minHeight: 520 }}>
        <div className="flex flex-col" style={{ minWidth: 0 }}>
          <DropZone compact onFile={loadFileText} accept=".json" label="">
            <div
              className="flex-1 overflow-hidden"
              style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius) var(--radius) 0 0' }}
            >
              <CodeMirror
                value={code}
                onChange={handleChange}
                extensions={[json()]}
                theme={oneDark}
                height="100%"
                basicSetup={{ lineNumbers: true, foldGutter: true }}
                style={{ fontSize: 13, fontFamily: 'var(--font-code)', height: '100%', minHeight: 400 }}
              />
            </div>
          </DropZone>
          <div
            className="flex items-center gap-2 px-4 py-2.5 text-xs font-medium"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderTop: 'none',
              borderRadius: '0 0 var(--radius) var(--radius)',
              color: validation.valid ? '#22C55E' : '#EF4444',
              fontFamily: 'var(--font-code)',
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: validation.valid ? '#22C55E' : '#EF4444', flexShrink: 0 }} />
            {validation.message || 'Enter JSON'}
          </div>
        </div>

        <div
          className="overflow-auto"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            padding: '16px 20px',
          }}
        >
          <div className="text-xs font-semibold mb-3" style={{ color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Tree View
          </div>
          {parsed !== null ? (
            <TreeNode value={parsed} expandedKeys={expandedKeys} toggleKey={toggleKey} path="root" />
          ) : (
            <div className="flex items-center justify-center h-full text-sm" style={{ color: 'var(--text-muted)', minHeight: 200 }}>
              {code ? 'Invalid JSON — fix errors to see tree' : 'Enter JSON to see tree view'}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
