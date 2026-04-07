import { useState, useCallback, useRef } from 'react'
import { Download, Upload, Trash2, Copy, AlertCircle, Sun, Moon, Keyboard, User, HelpCircle, ChevronDown, ChevronUp } from 'lucide-react'
import toast from 'react-hot-toast'
import { useDeviceId } from '../../contexts/DeviceContext'
import { useTheme } from '../../contexts/ThemeContext'
import { supabase } from '../../lib/supabase'
import useCloudState, { FORGE_STORAGE_IMPORT } from '../../hooks/useCloudState'
import { copyWithHistory } from '../../utils/copyWithHistory'
import ToolHeader from '../../components/ToolHeader'

const SHORTCUT_TOOLS = [
  { key: '1', label: 'QR Tools', path: '/qr' },
  { key: '2', label: 'JSON Editor', path: '/json-editor' },
  { key: '3', label: 'Diff Tool', path: '/diff' },
  { key: '4', label: 'CSV Editor', path: '/csv-editor' },
  { key: '5', label: 'Color Converter', path: '/color' },
  { key: '6', label: 'JWT Tool', path: '/jwt' },
  { key: '7', label: 'Meet', path: '/meet' },
  { key: '8', label: 'Base64', path: '/base64' },
  { key: '9', label: 'Timestamp', path: '/timestamp' },
  { key: '0', label: 'Hash', path: '/hash' },
  { key: null, label: 'Regex Tester', path: '/regex' },
  { key: null, label: 'Markdown', path: '/markdown' },
  { key: null, label: 'Image Tool', path: '/image' },
  { key: null, label: 'API Client', path: '/api' },
  { key: null, label: 'Settings', path: '/settings' },
]

const DEFAULT_SHORTCUT_MAP = Object.fromEntries(
  SHORTCUT_TOOLS.filter((t) => t.key !== null).map((t) => [t.key, t.path])
)

function buildFullMap(custom) {
  if (Object.keys(custom).length === 0) return { ...DEFAULT_SHORTCUT_MAP }
  const map = {}
  SHORTCUT_TOOLS.forEach((t) => {
    const customEntry = Object.entries(custom).find(([, p]) => p === t.path)
    if (customEntry) {
      map[customEntry[0]] = t.path
    } else if (t.key && !custom[t.key]) {
      map[t.key] = t.path
    }
  })
  Object.entries(custom).forEach(([k, p]) => { map[k] = p })
  return map
}

function ShortcutEditor() {
  const [shortcuts, setShortcuts] = useState(() => {
    try { return JSON.parse(localStorage.getItem('forge-custom-shortcuts')) || {} } catch { return {} }
  })
  const [editing, setEditing] = useState(null)

  const resolvedMap = buildFullMap(shortcuts)

  const saveShortcuts = useCallback((updated) => {
    setShortcuts(updated)
    if (Object.keys(updated).length > 0) {
      localStorage.setItem('forge-custom-shortcuts', JSON.stringify(updated))
    } else {
      localStorage.removeItem('forge-custom-shortcuts')
    }
    window.dispatchEvent(new Event('forge-shortcuts-changed'))
    toast.success('Shortcuts updated')
  }, [])

  const resetShortcuts = useCallback(() => {
    localStorage.removeItem('forge-custom-shortcuts')
    setShortcuts({})
    window.dispatchEvent(new Event('forge-shortcuts-changed'))
    toast.success('Shortcuts reset to defaults')
  }, [])

  const handleKeyCapture = useCallback((e, tool) => {
    if (e.key === 'Escape') { setEditing(null); return }
    if (e.key.length === 1 && /[0-9]/.test(e.key)) {
      const updated = { ...shortcuts }
      Object.keys(updated).forEach((k) => { if (updated[k] === tool.path) delete updated[k] })
      const currentHolder = Object.entries(resolvedMap).find(([k]) => k === e.key)
      if (currentHolder) {
        const oldPath = currentHolder[1]
        if (oldPath !== tool.path) {
          Object.keys(updated).forEach((k) => { if (updated[k] === oldPath) delete updated[k] })
          const oldTool = SHORTCUT_TOOLS.find((t) => t.path === oldPath)
          if (oldTool?.key && oldTool.key !== e.key) {
            const keyFree = !Object.values(updated).length || !Object.entries(buildFullMap(updated)).find(([k]) => k === oldTool.key)
            if (keyFree) { /* old tool falls back to its default */ }
          }
        }
      }
      updated[e.key] = tool.path
      saveShortcuts(updated)
      setEditing(null)
    }
  }, [shortcuts, saveShortcuts, resolvedMap])

  const getAssignedKey = (tool) => {
    const entry = Object.entries(resolvedMap).find(([, p]) => p === tool.path)
    return entry ? entry[0] : null
  }

  return (
    <div className="forge-card" style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Keyboard size={16} style={{ color: 'var(--text-muted)' }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Keyboard Shortcuts</span>
        </div>
        {Object.keys(shortcuts).length > 0 && (
          <button onClick={resetShortcuts} className="forge-btn" style={{ fontSize: 11, padding: '3px 8px' }}>Reset</button>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {SHORTCUT_TOOLS.map((tool) => {
          const assignedKey = getAssignedKey(tool)
          return (
            <div key={tool.path} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: 13, color: 'var(--text)' }}>{tool.label}</span>
              {editing === tool.path ? (
                <input autoFocus onKeyDown={(e) => handleKeyCapture(e, tool)} onBlur={() => setEditing(null)}
                  placeholder="Press 0-9" style={{ width: 80, background: 'var(--bg)', border: '1px solid var(--accent)', borderRadius: 4, padding: '3px 8px', color: 'var(--accent)', fontFamily: 'var(--font-code)', fontSize: 12, outline: 'none', textAlign: 'center' }} />
              ) : (
                <button onClick={() => setEditing(tool.path)}
                  style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 4, padding: '3px 10px', fontFamily: 'var(--font-code)', fontSize: 12, color: 'var(--text-muted)', cursor: 'pointer', minWidth: 50, textAlign: 'center', opacity: assignedKey ? 1 : 0.5 }}>
                  {assignedKey ? `\u2318${assignedKey}` : 'Not set'}
                </button>
              )}
            </div>
          )
        })}
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8, opacity: 0.6 }}>Click a shortcut to reassign. Press 0-9 to set a new key. Duplicates are automatically swapped.</div>
    </div>
  )
}

const FAQ_ITEMS = [
  { q: 'What is Forge?', a: 'Forge is a personal developer toolkit that bundles essential day-to-day tools like QR code generation, JSON editing, diff comparison, color conversion, JWT handling, and more — all in one fast, offline-capable web app.' },
  { q: 'What is a Forge ID?', a: 'Your Forge ID is a unique device identifier that enables cloud sync. Save it to restore your data on any device or after clearing browser cache. You can find it in Settings or on the Home dashboard.' },
  { q: 'Is my data stored securely?', a: 'Your data is stored locally in your browser and optionally synced to Supabase cloud storage tied to your anonymous Forge ID. No personal accounts or passwords are required.' },
  { q: 'Can I use Forge offline?', a: 'Yes! Forge is a Progressive Web App (PWA). Once installed, all tools work offline. Data syncs automatically when you reconnect.' },
  { q: 'How do I install Forge as an app?', a: 'Click the "Install Forge" button on the Home dashboard, or use your browser\'s install option (usually in the address bar or menu).' },
  { q: 'How do keyboard shortcuts work?', a: 'Press ⌘ (Cmd/Ctrl) + a number key to quickly navigate to tools. You can customize shortcuts in Settings > Keyboard Shortcuts. Click any key to reassign it.' },
  { q: 'How do I export/import my data?', a: 'Go to Settings > Export Data to download a JSON backup. Use Import Data to restore from a backup file. This works independently of cloud sync.' },
  { q: 'What tools are available?', a: 'QR Tools, JSON Editor (with Schema validation, TypeScript/Go conversion, JSONPath), Diff Tool, CSV Editor, Color Converter (with palette generator), JWT Tool, Meet Quick-Join, Base64, Timestamp Converter, Hash Generator, Regex Tester, Markdown Preview, Image Tool (resize/compress/convert), and API Client (HTTP request builder).' },
  { q: 'Can I change the theme?', a: 'Yes! Go to Settings > Appearance to choose from theme presets (Default, Solarized, Nord, Dracula), pick from six accent colors or use a custom color picker, and toggle between dark and light modes.' },
  { q: 'How do I search or navigate quickly?', a: 'Press ⌘K (or Ctrl+K) to open the Command Palette. Type to search for any tool or action.' },
]

function FAQSection() {
  const [openIdx, setOpenIdx] = useState(null)
  return (
    <div className="forge-card" style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <HelpCircle size={16} style={{ color: 'var(--text-muted)' }} />
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>FAQ & Help</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {FAQ_ITEMS.map((item, i) => (
          <div key={i} style={{ borderBottom: '1px solid var(--border)' }}>
            <button onClick={() => setOpenIdx(openIdx === i ? null : i)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '12px 0', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text)', fontSize: 14, fontFamily: 'var(--font-ui)', fontWeight: 500, textAlign: 'left', gap: 12 }}>
              <span>{item.q}</span>
              {openIdx === i ? <ChevronUp size={14} style={{ flexShrink: 0, color: 'var(--text-muted)' }} /> : <ChevronDown size={14} style={{ flexShrink: 0, color: 'var(--text-muted)' }} />}
            </button>
            {openIdx === i && (
              <div style={{ padding: '0 0 12px', fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>{item.a}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function ProfileSection() {
  const [profile, setProfile] = useCloudState('user-profile', { firstName: '', lastName: '', email: '', birthday: '' })

  const updateField = useCallback((field, value) => {
    setProfile((prev) => ({ ...prev, [field]: value }))
  }, [setProfile])

  const inputStyle = {
    width: '100%', padding: '10px 14px', background: 'var(--bg)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius)', color: 'var(--text)', fontSize: 14, fontFamily: 'var(--font-ui)',
    outline: 'none', transition: 'border-color 0.15s',
  }

  return (
    <div className="forge-card" style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <User size={16} style={{ color: 'var(--text-muted)' }} />
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Profile</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>First Name</label>
          <input value={profile.firstName} onChange={(e) => updateField('firstName', e.target.value)}
            placeholder="John" style={inputStyle}
            onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
            onBlur={(e) => e.target.style.borderColor = 'var(--border)'} />
        </div>
        <div>
          <label style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>Last Name</label>
          <input value={profile.lastName} onChange={(e) => updateField('lastName', e.target.value)}
            placeholder="Doe" style={inputStyle}
            onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
            onBlur={(e) => e.target.style.borderColor = 'var(--border)'} />
        </div>
        <div>
          <label style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>Email</label>
          <input type="email" value={profile.email} onChange={(e) => updateField('email', e.target.value)}
            placeholder="john@example.com" style={inputStyle}
            onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
            onBlur={(e) => e.target.style.borderColor = 'var(--border)'} />
        </div>
        <div>
          <label style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>Birthday</label>
          <input type="date" value={profile.birthday} onChange={(e) => updateField('birthday', e.target.value)}
            style={inputStyle}
            onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
            onBlur={(e) => e.target.style.borderColor = 'var(--border)'} />
        </div>
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 10, opacity: 0.6 }}>Your profile info is saved locally and synced to your Forge ID.</div>
    </div>
  )
}

const ACCENT_DOTS = [
  { name: 'cyan',   dark: '#00D4FF', light: '#0891B2' },
  { name: 'blue',   dark: '#6366F1', light: '#818CF8' },
  { name: 'green',  dark: '#22C55E', light: '#16A34A' },
  { name: 'red',    dark: '#EF4444', light: '#DC2626' },
  { name: 'yellow', dark: '#EAB308', light: '#CA8A04' },
  { name: 'purple', dark: '#A855F7', light: '#9333EA' },
]

export default function Settings() {
  const deviceId = useDeviceId()
  const { mode, accentName, setAccentName, toggleMode, preset, setPreset, customAccent, setCustomAccent } = useTheme()
  const [showReset, setShowReset] = useState(false)
  const fileRef = useRef(null)

  const exportData = useCallback(() => {
    const data = {}
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key.startsWith('forge-')) {
        try { data[key] = JSON.parse(localStorage.getItem(key)) }
        catch { data[key] = localStorage.getItem(key) }
      }
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `forge-backup-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Data exported')
  }, [])

  const importData = useCallback(async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      const data = JSON.parse(text)
      let count = 0
      for (const [key, value] of Object.entries(data)) {
        if (key.startsWith('forge-')) {
          localStorage.setItem(key, JSON.stringify(value))
          count++
          if (deviceId) {
            const category = key.replace('forge-', '')
            await supabase.from('forge_data').upsert({ device_id: deviceId, category, data: value, updated_at: new Date().toISOString() }, { onConflict: 'device_id,category' })
          }
        }
      }
      window.dispatchEvent(new CustomEvent(FORGE_STORAGE_IMPORT))
      toast.success(`Imported ${count} item${count !== 1 ? 's' : ''}.`)
    } catch { toast.error('Invalid backup file') }
    e.target.value = ''
  }, [deviceId])

  const resetAll = useCallback(async () => {
    const keys = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key.startsWith('forge-') && key !== 'forge-device-id') keys.push(key)
    }
    keys.forEach((k) => localStorage.removeItem(k))
    if (deviceId) { await supabase.from('forge_data').delete().eq('device_id', deviceId) }
    window.dispatchEvent(new CustomEvent(FORGE_STORAGE_IMPORT))
    setShowReset(false)
    toast.success('All data cleared.')
  }, [deviceId])

  const btnStyle = {
    display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '14px 18px',
    background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius)',
    color: 'var(--text)', fontSize: 14, fontFamily: 'var(--font-ui)', cursor: 'pointer', transition: 'border-color 0.15s',
  }

  return (
    <div>
      <ToolHeader toolId="settings" title="Settings" description="Manage your Forge data and preferences" />

      {/* Profile */}
      <ProfileSection />

      {/* Forge ID */}
      <div className="forge-card" style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>Forge ID</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 200, padding: '12px 16px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontFamily: 'var(--font-code)', fontSize: 15, color: 'var(--accent)', letterSpacing: '0.05em' }}>
            {deviceId || 'Not set'}
          </div>
          <button onClick={() => copyWithHistory(deviceId)} className="forge-btn" style={{ padding: '10px 14px' }}>
            <Copy size={14} /> Copy
          </button>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>Save this ID to restore your data on any device or after clearing browser cache.</div>
      </div>

      {/* Appearance */}
      <div className="forge-card" style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16 }}>Appearance</div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', marginBottom: 10 }}>Theme Preset</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {[{ id: 'default', label: 'Default' }, { id: 'solarized', label: 'Solarized' }, { id: 'nord', label: 'Nord' }, { id: 'dracula', label: 'Dracula' }].map((t) => (
              <button key={t.id} onClick={() => setPreset(t.id)}
                className="forge-btn" style={{ padding: '8px 16px', fontSize: 12, borderColor: preset === t.id ? 'var(--accent)' : 'var(--border)', color: preset === t.id ? 'var(--accent)' : 'var(--text-muted)', fontWeight: preset === t.id ? 600 : 400 }}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', marginBottom: 10 }}>Accent Color</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {ACCENT_DOTS.map((c) => (
              <button key={c.name} onClick={() => setAccentName(c.name)} title={c.name}
                style={{
                  width: 32, height: 32, borderRadius: '50%', background: c[mode],
                  border: accentName === c.name ? '3px solid var(--text)' : '3px solid transparent',
                  cursor: 'pointer', transition: 'border-color 0.15s, transform 0.15s',
                  transform: accentName === c.name ? 'scale(1.1)' : 'scale(1)', flexShrink: 0,
                  boxShadow: accentName === c.name ? `0 0 12px ${c[mode]}40` : 'none',
                }}
              />
            ))}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 4 }}>
              <input type="color" value={customAccent || '#FF6B35'}
                onChange={(e) => { setCustomAccent(e.target.value); setAccentName('custom') }}
                style={{ width: 32, height: 32, border: accentName === 'custom' ? '3px solid var(--text)' : '3px solid transparent', borderRadius: '50%', cursor: 'pointer', padding: 0, background: 'none' }} />
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Custom</span>
            </div>
          </div>
        </div>

        <div>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', marginBottom: 10 }}>Theme Mode</div>
          <button onClick={toggleMode} className="forge-btn" style={{ padding: '10px 16px', fontSize: 13, gap: 8 }}>
            {mode === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            {mode === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          </button>
        </div>
      </div>

      {/* Keyboard Shortcuts */}
      <ShortcutEditor />

      {/* FAQ */}
      <FAQSection />

      {/* Share Forge */}
      <div className="forge-card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <Copy size={16} style={{ color: 'var(--text-muted)' }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Share Forge</span>
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>Share your Forge ID with someone else so they can import your saved data. They can enter your ID in the Forge ID field to sync your data.</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={() => { if (deviceId) copyWithHistory(deviceId, 'Forge ID copied! Share it with others.') }} className="forge-btn" style={{ padding: '10px 16px', fontSize: 13 }}>
            <Copy size={14} /> Copy Forge ID to Share
          </button>
          <button onClick={exportData} className="forge-btn" style={{ padding: '10px 16px', fontSize: 13 }}>
            <Download size={14} /> Export Data File
          </button>
        </div>
      </div>

      {/* Data Management */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
        <button onClick={exportData} style={btnStyle}
          onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--accent)'}
          onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}>
          <Download size={18} style={{ color: 'var(--accent)' }} />
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontWeight: 600 }}>Export Data</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Download all saved data as a JSON file</div>
          </div>
        </button>

        <button onClick={() => fileRef.current?.click()} style={btnStyle}
          onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--accent)'}
          onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}>
          <Upload size={18} style={{ color: 'var(--accent)' }} />
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontWeight: 600 }}>Import Data</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Restore data from a previously exported JSON file</div>
          </div>
        </button>
        <input ref={fileRef} type="file" accept=".json" onChange={importData} className="hidden" />

        <button onClick={() => setShowReset(true)} style={{ ...btnStyle, borderColor: 'rgba(239,68,68,0.3)' }}
          onMouseEnter={(e) => e.currentTarget.style.borderColor = '#EF4444'}
          onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgba(239,68,68,0.3)'}>
          <Trash2 size={18} style={{ color: '#EF4444' }} />
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontWeight: 600, color: '#EF4444' }}>Reset All Data</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Delete all saved data from this device and cloud</div>
          </div>
        </button>
      </div>

      {showReset && (
        <div className="forge-card" style={{ borderColor: 'rgba(239,68,68,0.3)', padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <AlertCircle size={18} style={{ color: '#EF4444' }} />
            <span style={{ fontSize: 14, fontWeight: 600, color: '#EF4444' }}>Are you sure?</span>
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>This will permanently delete all your saved QR codes, colors, meeting history, and tool data. Your Forge ID will be preserved.</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button onClick={resetAll} className="forge-btn" style={{ background: '#EF4444', color: '#fff', borderColor: '#EF4444', padding: '8px 16px' }}>
              <Trash2 size={13} /> Yes, delete everything
            </button>
            <button onClick={() => setShowReset(false)} className="forge-btn" style={{ padding: '8px 16px' }}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}
