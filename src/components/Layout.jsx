import { useState, useEffect, useCallback } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Sidebar from './Sidebar'
import CommandPalette from './CommandPalette'
import ClipboardHistoryPanel from './ClipboardHistoryPanel'
import DotGrid from './DotGrid'
import { useTheme } from '../contexts/ThemeContext'
import { buildDispatchMap, keyComboFor, resolveActive, SHORTCUT_CHANGE_EVENT, GLOBAL_EVENTS } from '../shortcuts/registry'

const pageVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
}

export default function Layout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { toggleMode } = useTheme()
  const [collapsed, setCollapsed] = useState(() => {
    try { return JSON.parse(localStorage.getItem('forge-sidebar-collapsed')) ?? false }
    catch { return false }
  })
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const buildFullMap = () => {
    const map = buildDispatchMap(resolveActive())
    try {
      const custom = JSON.parse(localStorage.getItem('forge-custom-nav-shortcuts')) || []
      for (const c of custom) {
        if (!c.key) continue
        const combo = `cmd:${c.key.toLowerCase()}`
        if (!map[combo]) {
          map[combo] = { id: `custom:${c.id}`, modifier: 'cmd', action: 'navigate', path: c.path }
        }
      }
    } catch { /* ignore */ }
    return map
  }
  const [dispatchMap, setDispatchMap] = useState(() => buildFullMap())

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    localStorage.setItem('forge-sidebar-collapsed', JSON.stringify(collapsed))
  }, [collapsed])

  useEffect(() => {
    const refresh = () => setDispatchMap(buildFullMap())
    window.addEventListener(SHORTCUT_CHANGE_EVENT, refresh)
    window.addEventListener('storage', refresh)
    return () => {
      window.removeEventListener(SHORTCUT_CHANGE_EVENT, refresh)
      window.removeEventListener('storage', refresh)
    }
  }, [])

  const handleGlobalEvent = useCallback((eventName) => {
    switch (eventName) {
      case GLOBAL_EVENTS.OPEN_PALETTE: setPaletteOpen((o) => !o); break
      case GLOBAL_EVENTS.TOGGLE_THEME: toggleMode(); break
      case GLOBAL_EVENTS.TOGGLE_SIDEBAR: setCollapsed((c) => !c); break
      case GLOBAL_EVENTS.TOGGLE_CLIPBOARD:
      default:
        window.dispatchEvent(new Event(eventName))
        break
    }
  }, [toggleMode])

  useEffect(() => {
    const onKeyDown = (e) => {
      const combo = keyComboFor(e)
      const shortcut = dispatchMap[combo]
      if (!shortcut) return
      // Avoid hijacking key input when typing text (for non-modifier shortcuts we don't have any yet)
      if (shortcut.modifier === 'cmd' && !(e.metaKey || e.ctrlKey)) return
      e.preventDefault()
      if (shortcut.action === 'navigate') {
        navigate(shortcut.path)
      } else if (shortcut.action === 'event') {
        handleGlobalEvent(shortcut.eventName)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [dispatchMap, navigate, handleGlobalEvent])

  return (
    <div className="flex" style={{ minHeight: '100vh', flexDirection: isMobile ? 'column' : 'row', position: 'relative' }}>
      <div
        aria-hidden="true"
        style={{
          position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
          opacity: 0.35,
        }}
      >
        <DotGrid globalMouse spacing={32} baseAlpha={0.08} influence={140} />
      </div>
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flex: 1, flexDirection: isMobile ? 'column' : 'row', minHeight: '100vh' }}>
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} isMobile={isMobile} />
        <main className="flex-1 overflow-y-auto" style={{ padding: isMobile ? '16px 12px 72px' : '32px 40px' }}>
          <div style={{ maxWidth: 1400, margin: '0 auto' }}>
            <AnimatePresence mode="wait">
              <motion.div key={location.pathname} variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.2 }}>
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
        <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
        <ClipboardHistoryPanel />
      </div>
    </div>
  )
}
