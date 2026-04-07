import { useState, useEffect } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Sidebar from './Sidebar'
import CommandPalette from './CommandPalette'
import ClipboardHistoryPanel from './ClipboardHistoryPanel'

const pageVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
}

export default function Layout() {
  const navigate = useNavigate()
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(() => {
    try { return JSON.parse(localStorage.getItem('forge-sidebar-collapsed')) ?? false }
    catch { return false }
  })
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768)
  const [paletteOpen, setPaletteOpen] = useState(false)

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    localStorage.setItem('forge-sidebar-collapsed', JSON.stringify(collapsed))
  }, [collapsed])

  useEffect(() => {
    const onKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setPaletteOpen((o) => !o)
        return
      }
      if (!(e.metaKey || e.ctrlKey)) return
      if (!/^[0-9]$/.test(e.key)) return

      const defaultMap = { '1': '/qr', '2': '/json-editor', '3': '/diff', '4': '/csv-editor', '5': '/color', '6': '/jwt', '7': '/meet', '8': '/base64', '9': '/timestamp', '0': '/hash' }
      let custom = null
      try { custom = JSON.parse(localStorage.getItem('forge-custom-shortcuts')) } catch { /* ignore parse errors */ }

      if (custom && Object.keys(custom).length > 0) {
        const resolved = {}
        Object.entries(custom).forEach(([k, p]) => { resolved[k] = p })
        Object.entries(defaultMap).forEach(([k, p]) => {
          if (!custom[k] && !Object.entries(custom).find(([, cp]) => cp === p)) resolved[k] = p
        })
        if (resolved[e.key]) { e.preventDefault(); navigate(resolved[e.key]) }
      } else {
        if (defaultMap[e.key]) { e.preventDefault(); navigate(defaultMap[e.key]) }
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [navigate])

  return (
    <div className="flex" style={{ minHeight: '100vh', flexDirection: isMobile ? 'column' : 'row' }}>
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
  )
}
