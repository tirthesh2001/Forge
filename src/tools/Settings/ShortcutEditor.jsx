import { useCallback, useEffect, useMemo, useState } from 'react'
import { Keyboard, Plus, X, RotateCcw, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import {
  ALL_SHORTCUTS, readOverrides, writeOverrides, resolveActive, SHORTCUT_CHANGE_EVENT, shortcutById,
} from '../../shortcuts/registry'

const VALID_KEY = /^[a-z0-9]$/i

function formatCombo(s, key) {
  if (!key) return null
  if (s.modifier === 'cmd') return `⌘${key.toUpperCase()}`
  return key.toUpperCase()
}

function ShortcutRow({ shortcut, active, overrides, onSave, onClear }) {
  const [editing, setEditing] = useState(false)
  const currentKey = active[shortcut.id] || ''
  const isOverride = Object.prototype.hasOwnProperty.call(overrides, shortcut.id)

  const handleKeyCapture = useCallback((e) => {
    e.preventDefault()
    if (e.key === 'Escape') { setEditing(false); return }
    if (e.key === 'Backspace' || e.key === 'Delete') {
      onSave(shortcut.id, '')
      setEditing(false)
      return
    }
    if (!VALID_KEY.test(e.key)) {
      toast.error('Use a letter or number key')
      return
    }
    onSave(shortcut.id, e.key.toLowerCase())
    setEditing(false)
  }, [onSave, shortcut.id])

  const combo = formatCombo(shortcut, currentKey)

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)', gap: 12 }}>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 13, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span>{shortcut.label}</span>
          {isOverride && (
            <span style={{ fontSize: 10, padding: '1px 5px', borderRadius: 3, background: 'color-mix(in srgb, var(--accent) 18%, transparent)', color: 'var(--accent)', fontWeight: 600, letterSpacing: '0.04em' }}>
              CUSTOM
            </span>
          )}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, fontFamily: 'var(--font-code)' }}>
          {shortcut.action === 'navigate' ? shortcut.path : shortcut.eventName}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {editing ? (
          <input
            autoFocus
            onKeyDown={handleKeyCapture}
            onBlur={() => setEditing(false)}
            placeholder="Press key"
            readOnly
            style={{
              width: 100, background: 'var(--bg)', border: '1px solid var(--accent)', borderRadius: 4,
              padding: '4px 8px', color: 'var(--accent)', fontFamily: 'var(--font-code)', fontSize: 12,
              outline: 'none', textAlign: 'center',
            }}
          />
        ) : (
          <button onClick={() => setEditing(true)}
            title="Click to assign. Backspace to unbind. Esc to cancel."
            style={{
              background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 4,
              padding: '4px 10px', fontFamily: 'var(--font-code)', fontSize: 12,
              color: combo ? 'var(--text)' : 'var(--text-muted)', cursor: 'pointer',
              minWidth: 60, textAlign: 'center', opacity: combo ? 1 : 0.5,
            }}>
            {combo || 'Unbound'}
          </button>
        )}
        {isOverride && (
          <button onClick={() => onClear(shortcut.id)} title="Reset to default"
            style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: 4, padding: 4, color: 'var(--text-muted)', cursor: 'pointer', display: 'flex' }}>
            <X size={12} />
          </button>
        )}
      </div>
    </div>
  )
}

function AddCustomDialog({ open, onClose, onAdd }) {
  const [label, setLabel] = useState('')
  const [path, setPath] = useState('/')
  const [key, setKey] = useState('')

  useEffect(() => {
    if (!open) { setLabel(''); setPath('/'); setKey('') }
  }, [open])

  if (!open) return null

  const submit = () => {
    if (!label.trim()) return toast.error('Enter a label')
    if (!path.startsWith('/')) return toast.error('Path must start with /')
    if (key && !VALID_KEY.test(key)) return toast.error('Key must be a single letter or number')
    onAdd({ label: label.trim(), path: path.trim(), key: key.toLowerCase() })
    onClose()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.45)' }} onClick={onClose}>
      <div className="forge-card" style={{ width: 420, maxWidth: '92vw', padding: 20 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: 'var(--text)' }}>Add custom navigation shortcut</div>
        <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Label</label>
        <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Open internal dashboard"
          style={{ width: '100%', padding: '8px 10px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--text)', fontSize: 13, marginBottom: 10, outline: 'none' }} />
        <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Path (internal route)</label>
        <input value={path} onChange={(e) => setPath(e.target.value)} placeholder="/qr"
          style={{ width: '100%', padding: '8px 10px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--text)', fontSize: 13, fontFamily: 'var(--font-code)', marginBottom: 10, outline: 'none' }} />
        <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Key (optional, with ⌘/Ctrl)</label>
        <input value={key} onChange={(e) => setKey(e.target.value.slice(-1))} placeholder="e.g. q"
          maxLength={1}
          style={{ width: 80, padding: '8px 10px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--text)', fontSize: 13, fontFamily: 'var(--font-code)', marginBottom: 16, outline: 'none', textAlign: 'center' }} />
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onClose} className="forge-btn" style={{ padding: '6px 14px', fontSize: 12 }}>Cancel</button>
          <button onClick={submit} className="forge-btn forge-btn-primary" style={{ padding: '6px 14px', fontSize: 12 }}>Add</button>
        </div>
      </div>
    </div>
  )
}

export default function ShortcutEditor() {
  const [overrides, setOverrides] = useState(() => readOverrides())
  const [custom, setCustom] = useState(() => {
    try { return JSON.parse(localStorage.getItem('forge-custom-nav-shortcuts')) || [] } catch { return [] }
  })
  const [addOpen, setAddOpen] = useState(false)

  const active = useMemo(() => {
    const base = resolveActive(overrides)
    for (const c of custom) {
      if (c.key) base[`custom:${c.id}`] = c.key
    }
    return base
  }, [overrides, custom])

  const conflicts = useMemo(() => {
    const map = new Map()
    const seen = new Map()
    for (const s of ALL_SHORTCUTS) {
      const k = (active[s.id] || '').toLowerCase()
      if (!k) continue
      const combo = `${s.modifier}:${k}`
      if (seen.has(combo)) {
        const prev = seen.get(combo)
        map.set(s.id, prev)
        map.set(prev, s.id)
      } else {
        seen.set(combo, s.id)
      }
    }
    return map
  }, [active])

  const save = useCallback((id, key) => {
    const next = { ...overrides }
    const target = shortcutById(id)
    if (key && target && key === target.defaultKey) {
      delete next[id]
    } else {
      next[id] = key
    }
    setOverrides(next)
    writeOverrides(next)
    toast.success(key ? `Bound ${target?.modifier === 'cmd' ? '⌘' : ''}${key.toUpperCase()}` : 'Unbound')
  }, [overrides])

  const clearOne = useCallback((id) => {
    const next = { ...overrides }
    delete next[id]
    setOverrides(next)
    writeOverrides(next)
    toast.success('Reset to default')
  }, [overrides])

  const resetAll = useCallback(() => {
    setOverrides({})
    writeOverrides({})
    toast.success('All shortcuts reset')
  }, [])

  const addCustom = useCallback(({ label, path, key }) => {
    const entry = { id: `${Date.now()}`, label, path, key: key || null }
    const next = [...custom, entry]
    setCustom(next)
    try { localStorage.setItem('forge-custom-nav-shortcuts', JSON.stringify(next)) } catch { /* ignore */ }
    // Broadcast so Layout picks up the new binding (custom ones are not in the registry, so we add them to a lightweight extra map)
    window.dispatchEvent(new Event(SHORTCUT_CHANGE_EVENT))
    toast.success('Shortcut added')
  }, [custom])

  const removeCustom = useCallback((id) => {
    const next = custom.filter((c) => c.id !== id)
    setCustom(next)
    try {
      if (next.length) localStorage.setItem('forge-custom-nav-shortcuts', JSON.stringify(next))
      else localStorage.removeItem('forge-custom-nav-shortcuts')
    } catch { /* ignore */ }
    window.dispatchEvent(new Event(SHORTCUT_CHANGE_EVENT))
  }, [custom])

  const grouped = useMemo(() => {
    const g = { global: [], navigation: [] }
    for (const s of ALL_SHORTCUTS) {
      if (g[s.group]) g[s.group].push(s)
    }
    return g
  }, [])

  const renderSection = (title, items) => (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 6 }}>{title}</div>
      {items.map((s) => {
        const conflictWith = conflicts.get(s.id)
        return (
          <div key={s.id}>
            <ShortcutRow shortcut={s} active={active} overrides={overrides} onSave={save} onClear={clearOne} />
            {conflictWith && (
              <div style={{ fontSize: 10, color: '#EF4444', padding: '2px 0 6px', display: 'flex', alignItems: 'center', gap: 4 }}>
                <AlertCircle size={10} /> Conflicts with “{shortcutById(conflictWith)?.label}”
              </div>
            )}
          </div>
        )
      })}
    </div>
  )

  return (
    <>
      <div className="forge-card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Keyboard size={16} style={{ color: 'var(--text-muted)' }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Keyboard Shortcuts</span>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => setAddOpen(true)} className="forge-btn" style={{ fontSize: 11, padding: '4px 10px', gap: 4 }}>
              <Plus size={12} /> Add
            </button>
            {Object.keys(overrides).length > 0 && (
              <button onClick={resetAll} className="forge-btn" style={{ fontSize: 11, padding: '4px 10px', gap: 4 }}>
                <RotateCcw size={12} /> Reset
              </button>
            )}
          </div>
        </div>

        {renderSection('Global', grouped.global)}
        {renderSection('Navigation', grouped.navigation)}

        {custom.length > 0 && (
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 6 }}>Custom</div>
            {custom.map((c) => (
              <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 13, color: 'var(--text)' }}>{c.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, fontFamily: 'var(--font-code)' }}>{c.path}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ padding: '4px 10px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 4, fontFamily: 'var(--font-code)', fontSize: 12, color: c.key ? 'var(--text)' : 'var(--text-muted)', minWidth: 60, textAlign: 'center' }}>
                    {c.key ? `⌘${c.key.toUpperCase()}` : 'No key'}
                  </div>
                  <button onClick={() => removeCustom(c.id)}
                    style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: 4, padding: 4, color: 'var(--text-muted)', cursor: 'pointer', display: 'flex' }}>
                    <X size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8, opacity: 0.7, lineHeight: 1.5 }}>
          Click any shortcut to reassign. Press a letter or number. Press <kbd style={kbdStyle}>Backspace</kbd> to unbind, <kbd style={kbdStyle}>Esc</kbd> to cancel. Conflicts are highlighted below affected rows.
        </div>
      </div>

      <AddCustomDialog open={addOpen} onClose={() => setAddOpen(false)} onAdd={addCustom} />
    </>
  )
}

const kbdStyle = {
  display: 'inline-block', padding: '0 4px', fontFamily: 'var(--font-code)', fontSize: 10,
  background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 3, color: 'var(--text)',
}
