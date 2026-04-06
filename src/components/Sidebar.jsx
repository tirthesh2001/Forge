import { useState, useEffect, useMemo } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  QrCode, Braces, GitCompare, Table, Palette, KeyRound, Video,
  FileCode2, Clock, Hash, Regex, FileText, Home, Settings, Image, Send,
  ChevronLeft, ChevronRight, Sun, Moon, Copy,
} from 'lucide-react'
import { useTheme } from '../contexts/ThemeContext'
import { useDeviceId } from '../contexts/DeviceContext'
import ForgeIcon from './ForgeIcon'
import toast from 'react-hot-toast'

const navItems = [
  { label: 'Home', icon: Home, path: '/', defaultKey: null },
  { label: 'QR Tools', icon: QrCode, path: '/qr', defaultKey: '1' },
  { label: 'JSON Editor', icon: Braces, path: '/json-editor', defaultKey: '2' },
  { label: 'Diff Tool', icon: GitCompare, path: '/diff', defaultKey: '3' },
  { label: 'CSV Editor', icon: Table, path: '/csv-editor', defaultKey: '4' },
  { label: 'Color Converter', icon: Palette, path: '/color', defaultKey: '5' },
  { label: 'JWT Tool', icon: KeyRound, path: '/jwt', defaultKey: '6' },
  { label: 'Meet', icon: Video, path: '/meet', defaultKey: '7' },
  { label: 'Base64', icon: FileCode2, path: '/base64', defaultKey: '8' },
  { label: 'Timestamp', icon: Clock, path: '/timestamp', defaultKey: '9' },
  { label: 'Hash', icon: Hash, path: '/hash', defaultKey: '0' },
  { label: 'Regex', icon: Regex, path: '/regex', defaultKey: null },
  { label: 'Markdown', icon: FileText, path: '/markdown', defaultKey: null },
  { label: 'Image Tool', icon: Image, path: '/image', defaultKey: null },
  { label: 'API Client', icon: Send, path: '/api', defaultKey: null },
]

export { navItems }

function useShortcutMap() {
  const [ver, setVer] = useState(0)
  useEffect(() => {
    const handler = () => setVer((v) => v + 1)
    window.addEventListener('forge-shortcuts-changed', handler)
    return () => window.removeEventListener('forge-shortcuts-changed', handler)
  }, [])
  return useMemo(() => {
    void ver
    let custom = null
    try { custom = JSON.parse(localStorage.getItem('forge-custom-shortcuts')) } catch { /* ignore */ }
    if (!custom || Object.keys(custom).length === 0) {
      const map = {}
      navItems.forEach((n) => { if (n.defaultKey) map[n.path] = n.defaultKey })
      return map
    }
    const map = {}
    navItems.forEach((n) => {
      const entry = Object.entries(custom).find(([, p]) => p === n.path)
      if (entry) { map[n.path] = entry[0] }
      else if (n.defaultKey && !custom[n.defaultKey]) { map[n.path] = n.defaultKey }
    })
    return map
  }, [ver])
}

export default function Sidebar({ collapsed, onToggle, isMobile }) {
  const { mode, toggleMode } = useTheme()
  const deviceId = useDeviceId()
  const navigate = useNavigate()
  const shortcutMap = useShortcutMap()

  if (isMobile) {
    return (
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 flex items-center"
        style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)', height: 56, backdropFilter: 'blur(12px)', overflowX: 'auto', overflowY: 'hidden', gap: 0, WebkitOverflowScrolling: 'touch' }}
      >
        <NavLink to="/" end className="flex items-center justify-center" style={({ isActive }) => ({ color: isActive ? 'var(--accent)' : 'var(--text-muted)', minWidth: 48, height: 48, flexShrink: 0 })}>
          <Home size={20} />
        </NavLink>
        {navItems.filter((_, i) => i > 0).map((item) => (
          <NavLink key={item.path} to={item.path} className="flex items-center justify-center"
            style={({ isActive }) => ({ color: isActive ? 'var(--accent)' : 'var(--text-muted)', minWidth: 48, height: 48, flexShrink: 0, transition: 'color 0.15s' })}>
            <item.icon size={18} />
          </NavLink>
        ))}
        <NavLink to="/settings" className="flex items-center justify-center"
          style={({ isActive }) => ({ color: isActive ? 'var(--accent)' : 'var(--text-muted)', minWidth: 48, height: 48, flexShrink: 0 })}>
          <Settings size={18} />
        </NavLink>
        <button onClick={toggleMode} className="flex items-center justify-center"
          style={{ color: 'var(--text-muted)', minWidth: 48, height: 48, flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer' }}>
          {mode === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </nav>
    )
  }

  return (
    <aside
      className="flex flex-col h-screen sticky top-0 shrink-0 transition-all duration-200"
      style={{ width: collapsed ? 'var(--sidebar-collapsed)' : 'var(--sidebar-expanded)', background: 'var(--surface)', borderRight: '1px solid var(--border)' }}
    >
      <div className="flex items-center justify-center shrink-0" style={{ height: 56, borderBottom: '1px solid var(--border)', cursor: 'pointer' }} onClick={() => navigate('/')}>
        {collapsed ? (
          <ForgeIcon size={32} />
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ForgeIcon size={36} />
            <span className="font-bold whitespace-nowrap" style={{ color: 'var(--accent)', fontFamily: 'var(--font-ui)', fontSize: 20, letterSpacing: '0.08em' }}>
              FORGE
            </span>
          </div>
        )}
      </div>

      <nav className="flex-1 flex flex-col gap-1 px-2 py-3 overflow-y-auto">
        {navItems.map((item) => {
          const key = shortcutMap[item.path]
          const shortcutLabel = key ? `\u2318${key}` : ''
          return (
            <NavLink
              key={item.path} to={item.path} end={item.path === '/'}
              title={collapsed ? `${item.label}  ${shortcutLabel}` : undefined}
              className="group flex items-center gap-3 rounded-lg transition-all duration-150"
              style={({ isActive }) => ({
                padding: collapsed ? '10px 0' : '10px 12px',
                justifyContent: collapsed ? 'center' : 'flex-start',
                color: isActive ? 'var(--accent)' : 'var(--text-muted)',
                background: isActive ? 'color-mix(in srgb, var(--accent) 8%, transparent)' : 'transparent',
                borderLeft: isActive ? '3px solid var(--accent)' : '3px solid transparent',
                fontSize: 14,
              })}
              onMouseEnter={(e) => { if (!e.currentTarget.getAttribute('aria-current')) e.currentTarget.style.background = 'var(--surface-hover)' }}
              onMouseLeave={(e) => { if (!e.currentTarget.getAttribute('aria-current')) e.currentTarget.style.background = 'transparent' }}
            >
              <item.icon size={18} />
              {!collapsed && (
                <>
                  <span className="flex-1 whitespace-nowrap">{item.label}</span>
                  {shortcutLabel && <span className="text-xs opacity-40" style={{ fontFamily: 'var(--font-code)' }}>{shortcutLabel}</span>}
                </>
              )}
            </NavLink>
          )
        })}
      </nav>

      <NavLink to="/settings"
        className="flex items-center gap-3 mx-2 rounded-lg transition-all duration-150"
        style={({ isActive }) => ({
          padding: collapsed ? '10px 0' : '10px 12px',
          justifyContent: collapsed ? 'center' : 'flex-start',
          color: isActive ? 'var(--accent)' : 'var(--text-muted)',
          background: isActive ? 'color-mix(in srgb, var(--accent) 8%, transparent)' : 'transparent',
          fontSize: 14, borderTop: '1px solid var(--border)',
        })}
      >
        <Settings size={18} />
        {!collapsed && <span className="flex-1 whitespace-nowrap">Settings</span>}
      </NavLink>

      <div style={{ borderTop: '1px solid var(--border)', padding: collapsed ? '12px 8px' : '14px 16px' }}>
        <button onClick={toggleMode} className="flex items-center justify-center gap-2"
          style={{
            width: '100%', padding: '8px 0', fontSize: 12, fontWeight: 500, color: 'var(--text-muted)',
            background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius)',
            cursor: 'pointer', transition: 'background 0.15s, color 0.15s', fontFamily: 'var(--font-ui)',
          }}>
          {mode === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
          {!collapsed && (mode === 'dark' ? 'Light mode' : 'Dark mode')}
        </button>

        {!collapsed && deviceId && (
          <button onClick={() => { navigator.clipboard.writeText(deviceId); toast.success('Forge ID copied') }}
            title="Click to copy your Forge ID"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%',
              marginTop: 8, padding: '6px 0', fontSize: 10, fontFamily: 'var(--font-code)',
              color: 'var(--text-muted)', background: 'transparent', border: 'none', cursor: 'pointer',
              opacity: 0.6, letterSpacing: '0.05em',
            }}>
            {deviceId} <Copy size={10} />
          </button>
        )}
      </div>

      <button onClick={onToggle} className="flex items-center justify-center shrink-0 cursor-pointer transition-colors duration-150"
        style={{ height: 44, color: 'var(--text-muted)', background: 'transparent', border: 'none', borderTop: '1px solid var(--border)' }}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
        {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
      </button>
    </aside>
  )
}
