import { useState, useMemo, useCallback } from 'react'
import { Copy, ChevronDown, ChevronUp, Bookmark, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import useCloudState from '../../hooks/useCloudState'
import ToolHeader from '../../components/ToolHeader'
import { copyWithHistory } from '../../utils/copyWithHistory'

const CHEATSHEET = [
  { cat: 'Basics', items: ['.  Any character', '\\d  Digit [0-9]', '\\w  Word char [a-zA-Z0-9_]', '\\s  Whitespace', '\\b  Word boundary'] },
  { cat: 'Quantifiers', items: ['*  0 or more', '+  1 or more', '?  0 or 1', '{n}  Exactly n', '{n,m}  Between n and m'] },
  { cat: 'Groups', items: ['(abc)  Capture group', '(?:abc)  Non-capture', '(?<name>abc)  Named group', 'a|b  Alternation'] },
  { cat: 'Anchors', items: ['^  Start of string', '$  End of string', '\\b  Word boundary'] },
  { cat: 'Classes', items: ['[abc]  Character set', '[^abc]  Negated set', '[a-z]  Range', '[\\d\\s]  Combined'] },
]

const FLAGS = [
  { key: 'g', label: 'global' },
  { key: 'i', label: 'case-insensitive' },
  { key: 'm', label: 'multiline' },
  { key: 's', label: 'dotAll' },
]

export default function RegexTool() {
  const [pattern, setPattern] = useState('')
  const [flags, setFlags] = useState({ g: true, i: false, m: false, s: false })
  const [testStr, setTestStr] = useState('')
  const [showCheat, setShowCheat] = useState(false)
  const [savedRegex, setSavedRegex] = useCloudState('regex-saved', [])
  const [saveName, setSaveName] = useState('')

  const toggleFlag = useCallback((f) => setFlags((prev) => ({ ...prev, [f]: !prev[f] })), [])
  const flagStr = Object.entries(flags).filter(([, v]) => v).map(([k]) => k).join('')

  const { regex, error } = useMemo(() => {
    if (!pattern) return { regex: null, error: null }
    try { return { regex: new RegExp(pattern, flagStr), error: null } }
    catch (e) { return { regex: null, error: e.message } }
  }, [pattern, flagStr])

  const matches = useMemo(() => {
    if (!regex || !testStr) return []
    const results = []
    let m
    if (regex.global) {
      while ((m = regex.exec(testStr)) !== null) {
        results.push({ index: m.index, value: m[0], groups: m.slice(1), named: m.groups || {} })
        if (m[0] === '') { regex.lastIndex++; if (regex.lastIndex > testStr.length) break }
      }
    } else {
      m = regex.exec(testStr)
      if (m) results.push({ index: m.index, value: m[0], groups: m.slice(1), named: m.groups || {} })
    }
    return results
  }, [regex, testStr])

  const highlighted = useMemo(() => {
    if (!regex || !testStr || matches.length === 0) return null
    const parts = []
    let last = 0
    matches.forEach((m) => {
      if (m.index > last) parts.push({ text: testStr.slice(last, m.index), match: false })
      parts.push({ text: m.value, match: true })
      last = m.index + m.value.length
    })
    if (last < testStr.length) parts.push({ text: testStr.slice(last), match: false })
    return parts
  }, [regex, testStr, matches])

  const saveRegex = useCallback(() => {
    if (!pattern) { toast.error('Enter a pattern first'); return }
    const entry = { id: Date.now().toString(), name: saveName || pattern, pattern, flags: flagStr, createdAt: new Date().toISOString() }
    setSavedRegex((prev) => [entry, ...prev])
    setSaveName('')
    toast.success('Regex saved')
  }, [pattern, flagStr, saveName, setSavedRegex])

  const loadRegex = useCallback((item) => {
    setPattern(item.pattern)
    const f = { g: false, i: false, m: false, s: false }
    item.flags.split('').forEach((c) => { if (f[c] !== undefined) f[c] = true })
    setFlags(f)
    toast.success('Loaded')
  }, [])

  const deleteRegex = useCallback((id) => {
    setSavedRegex((prev) => prev.filter((r) => r.id !== id))
    toast.success('Deleted')
  }, [setSavedRegex])

  return (
    <div>
      <ToolHeader toolId="regex" title="Regex Tester" description="Test regular expressions with live highlighting">
        <button onClick={() => setShowCheat(!showCheat)} className="forge-btn" style={{ fontSize: 12 }}>
          {showCheat ? <ChevronUp size={13} /> : <ChevronDown size={13} />} Cheatsheet
        </button>
      </ToolHeader>

      {showCheat && (
        <div className="forge-card" style={{ marginBottom: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
            {CHEATSHEET.map((cat) => (
              <div key={cat.cat}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)', marginBottom: 6 }}>{cat.cat}</div>
                {cat.items.map((item) => (
                  <div key={item} style={{ fontSize: 12, fontFamily: 'var(--font-code)', color: 'var(--text-muted)', lineHeight: 1.8 }}>{item}</div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="forge-card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
          <span style={{ fontSize: 16, color: 'var(--text-muted)', fontFamily: 'var(--font-code)' }}>/</span>
          <input value={pattern} onChange={(e) => setPattern(e.target.value)} placeholder="Enter regex pattern..."
            style={{ flex: 1, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '10px 14px', color: 'var(--text)', fontFamily: 'var(--font-code)', fontSize: 14, outline: 'none' }} />
          <span style={{ fontSize: 16, color: 'var(--text-muted)', fontFamily: 'var(--font-code)' }}>/{flagStr}</span>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          {FLAGS.map((f) => (
            <button key={f.key} onClick={() => toggleFlag(f.key)}
              style={{
                padding: '4px 10px', fontSize: 12, borderRadius: 6, cursor: 'pointer', fontFamily: 'var(--font-code)',
                border: flags[f.key] ? '1px solid var(--accent)' : '1px solid var(--border)',
                background: flags[f.key] ? 'color-mix(in srgb, var(--accent) 12%, transparent)' : 'transparent',
                color: flags[f.key] ? 'var(--accent)' : 'var(--text-muted)',
              }}>{f.key}</button>
          ))}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center' }}>
            <input value={saveName} onChange={(e) => setSaveName(e.target.value)} placeholder="Name (optional)" style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '4px 10px', color: 'var(--text)', fontFamily: 'var(--font-code)', fontSize: 11, outline: 'none', width: 120 }} />
            <button onClick={saveRegex} className="forge-btn" style={{ padding: '4px 10px', fontSize: 11 }}><Bookmark size={11} /> Save</button>
          </div>
        </div>
        {error && <div style={{ marginTop: 8, fontSize: 12, color: '#EF4444' }}>{error}</div>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="forge-card" style={{ padding: 0 }}>
          <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Test String</span>
          </div>
          <textarea value={testStr} onChange={(e) => setTestStr(e.target.value)} placeholder="Enter test string..." rows={10}
            style={{ width: '100%', background: 'var(--bg)', border: 'none', borderRadius: 0, padding: '14px 16px', color: 'var(--text)', fontFamily: 'var(--font-code)', fontSize: 13, resize: 'vertical', outline: 'none' }} />
        </div>

        <div className="forge-card" style={{ padding: 0 }}>
          <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {highlighted ? `${matches.length} match${matches.length !== 1 ? 'es' : ''}` : 'Highlighted'}
            </span>
          </div>
          <div style={{ padding: '14px 16px', minHeight: 200, fontFamily: 'var(--font-code)', fontSize: 13, lineHeight: 1.7, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
            {!highlighted && !testStr && <span style={{ color: 'var(--text-muted)' }}>Matches will be highlighted here</span>}
            {!highlighted && testStr && <span style={{ color: 'var(--text)' }}>{testStr}</span>}
            {highlighted && highlighted.map((p, i) => (
              p.match ? <span key={i} style={{ background: 'color-mix(in srgb, var(--accent) 25%, transparent)', color: 'var(--accent)', borderRadius: 2, padding: '1px 2px' }}>{p.text}</span>
                : <span key={i} style={{ color: 'var(--text)' }}>{p.text}</span>
            ))}
          </div>
        </div>
      </div>

      {matches.length > 0 && (
        <div className="forge-card" style={{ marginTop: 16, padding: 0 }}>
          <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Match Details</span>
          </div>
          <div style={{ maxHeight: 300, overflowY: 'auto' }}>
            {matches.map((m, i) => (
              <div key={i} style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', fontSize: 12, fontFamily: 'var(--font-code)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ color: 'var(--accent)' }}>Match {i + 1}</span>
                  <span style={{ color: 'var(--text-muted)' }}>Index: {m.index}</span>
                </div>
                <div style={{ color: 'var(--text)', marginBottom: m.groups.length ? 4 : 0 }}>"{m.value}"</div>
                {m.groups.length > 0 && (
                  <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>
                    Groups: {m.groups.map((g, j) => <span key={j} style={{ marginRight: 8 }}>[{j + 1}] "{g}"</span>)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {savedRegex.length > 0 && (
        <div className="forge-card" style={{ marginTop: 16, padding: 0 }}>
          <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Saved Patterns ({savedRegex.length})</span>
          </div>
          <div style={{ maxHeight: 300, overflowY: 'auto' }}>
            {savedRegex.map((r) => (
              <div key={r.id} onClick={() => loadRegex(r)}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderBottom: '1px solid var(--border)', cursor: 'pointer', transition: 'background 0.1s' }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-hover)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)', marginBottom: 2 }}>{r.name}</div>
                  <div style={{ fontSize: 11, fontFamily: 'var(--font-code)', color: 'var(--text-muted)' }}>/{r.pattern}/{r.flags}</div>
                </div>
                <button onClick={(e) => { e.stopPropagation(); copyWithHistory(r.pattern) }}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}><Copy size={12} /></button>
                <button onClick={(e) => { e.stopPropagation(); deleteRegex(r.id) }}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}><Trash2 size={12} /></button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
