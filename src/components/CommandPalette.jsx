import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  QrCode, Braces, GitCompare, Table, Palette, KeyRound, Video,
  FileCode2, Clock, Hash, Regex, FileText, Search, Settings, Home,
  Image, Send,
} from 'lucide-react'

const COMMANDS = [
  { id: 'home', label: 'Dashboard', desc: 'Go to home', icon: Home, action: 'nav', path: '/' },
  { id: 'qr', label: 'QR Tools', desc: 'Generate & scan QR codes', icon: QrCode, action: 'nav', path: '/qr', shortcut: '⌘1' },
  { id: 'json', label: 'JSON Editor', desc: 'Format, validate, convert JSON', icon: Braces, action: 'nav', path: '/json-editor', shortcut: '⌘2' },
  { id: 'diff', label: 'Diff Tool', desc: 'Compare text or JSON', icon: GitCompare, action: 'nav', path: '/diff', shortcut: '⌘3' },
  { id: 'csv', label: 'CSV Editor', desc: 'Edit and export CSV', icon: Table, action: 'nav', path: '/csv-editor', shortcut: '⌘4' },
  { id: 'color', label: 'Color Converter', desc: 'HEX, RGB, HSL & palettes', icon: Palette, action: 'nav', path: '/color', shortcut: '⌘5' },
  { id: 'jwt', label: 'JWT Tool', desc: 'Decode and sign tokens', icon: KeyRound, action: 'nav', path: '/jwt', shortcut: '⌘6' },
  { id: 'meet', label: 'Google Meet', desc: 'Quick-join meetings', icon: Video, action: 'nav', path: '/meet', shortcut: '⌘7' },
  { id: 'base64', label: 'Base64', desc: 'Encode and decode Base64', icon: FileCode2, action: 'nav', path: '/base64', shortcut: '⌘8' },
  { id: 'timestamp', label: 'Timestamp', desc: 'Unix & date conversion', icon: Clock, action: 'nav', path: '/timestamp', shortcut: '⌘9' },
  { id: 'hash', label: 'Hash Generator', desc: 'SHA-256, MD5 hashes', icon: Hash, action: 'nav', path: '/hash', shortcut: '⌘0' },
  { id: 'regex', label: 'Regex Tester', desc: 'Test regex patterns', icon: Regex, action: 'nav', path: '/regex' },
  { id: 'markdown', label: 'Markdown Preview', desc: 'Edit and preview markdown', icon: FileText, action: 'nav', path: '/markdown' },
  { id: 'image', label: 'Image Tool', desc: 'Resize, compress & convert images', icon: Image, action: 'nav', path: '/image' },
  { id: 'api', label: 'API Client', desc: 'HTTP request builder', icon: Send, action: 'nav', path: '/api' },
  { id: 'settings', label: 'Settings', desc: 'Export, import, themes, shortcuts', icon: Settings, action: 'nav', path: '/settings' },
]

export default function CommandPalette({ open, onClose }) {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(0)
  const inputRef = useRef(null)
  const navigate = useNavigate()

  const filtered = useMemo(() => {
    if (!query.trim()) return COMMANDS
    const q = query.toLowerCase()
    return COMMANDS.filter((c) =>
      c.label.toLowerCase().includes(q) ||
      c.desc.toLowerCase().includes(q) ||
      c.id.includes(q)
    )
  }, [query])

  useEffect(() => {
    if (open) {
      setQuery('')
      setSelected(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  const execute = useCallback((cmd) => {
    if (cmd.action === 'nav') navigate(cmd.path)
    onClose()
  }, [navigate, onClose])

  const onKeyDown = useCallback((e) => {
    if (e.key === 'Escape') { onClose(); return }
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelected((s) => Math.min(s + 1, filtered.length - 1)) }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSelected((s) => Math.max(s - 1, 0)) }
    if (e.key === 'Enter' && filtered[selected]) { execute(filtered[selected]) }
  }, [filtered, selected, execute, onClose])

  if (!open) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        style={{ position: 'fixed', inset: 0, zIndex: 999, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '15vh', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: -10, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10, scale: 0.98 }}
          transition={{ duration: 0.15 }}
          onClick={(e) => e.stopPropagation()}
          style={{
            width: '100%', maxWidth: 520, background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 12, overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
            <Search size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => { setQuery(e.target.value); setSelected(0) }}
              onKeyDown={onKeyDown}
              placeholder="Search tools and actions..."
              style={{
                flex: 1, background: 'transparent', border: 'none', outline: 'none',
                color: 'var(--text)', fontSize: 15, fontFamily: 'var(--font-ui)',
              }}
            />
            <kbd style={{ fontSize: 10, color: 'var(--text-muted)', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 4, padding: '2px 6px', fontFamily: 'var(--font-code)' }}>ESC</kbd>
          </div>

          <div style={{ maxHeight: 340, overflowY: 'auto', padding: '6px 0' }}>
            {filtered.length === 0 && (
              <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No results</div>
            )}
            {filtered.map((cmd, i) => (
              <button
                key={cmd.id}
                onClick={() => execute(cmd)}
                onMouseEnter={() => setSelected(i)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '10px 16px',
                  background: i === selected ? 'color-mix(in srgb, var(--accent) 10%, transparent)' : 'transparent',
                  border: 'none', cursor: 'pointer', textAlign: 'left', transition: 'background 0.1s',
                }}
              >
                <cmd.icon size={16} style={{ color: i === selected ? 'var(--accent)' : 'var(--text-muted)', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: i === selected ? 'var(--text)' : 'var(--text-muted)', fontFamily: 'var(--font-ui)' }}>{cmd.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', opacity: 0.6, marginTop: 1 }}>{cmd.desc}</div>
                </div>
                {cmd.shortcut && (
                  <kbd style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-code)', opacity: 0.5 }}>{cmd.shortcut}</kbd>
                )}
              </button>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
