import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  QrCode, Braces, GitCompare, Table, Palette, KeyRound, Video,
  FileCode2, Clock, Hash, Regex, FileText, Image, Send,
  ArrowRight, Copy, Download, GripVertical, Share2,
} from 'lucide-react'
import { useDeviceId } from '../../contexts/DeviceContext'
import useCloudState from '../../hooks/useCloudState'
import ForgeIcon from '../../components/ForgeIcon'
import DotGrid from '../../components/DotGrid'
import toast from 'react-hot-toast'
import { copyWithHistory } from '../../utils/copyWithHistory'

const DEFAULT_TOOLS = [
  { id: 'qr', label: 'QR Tools', desc: 'Generate & scan QR codes', icon: 'QrCode', path: '/qr', color: '#00D4FF' },
  { id: 'json', label: 'JSON Editor', desc: 'Format, validate & explore JSON', icon: 'Braces', path: '/json-editor', color: '#6366F1' },
  { id: 'diff', label: 'Diff Tool', desc: 'Compare & merge text or JSON', icon: 'GitCompare', path: '/diff', color: '#22C55E' },
  { id: 'csv', label: 'CSV Editor', desc: 'Import, edit & export CSV data', icon: 'Table', path: '/csv-editor', color: '#EAB308' },
  { id: 'color', label: 'Color Converter', desc: 'HEX, RGB, HSL & palettes', icon: 'Palette', path: '/color', color: '#A855F7' },
  { id: 'jwt', label: 'JWT Tool', desc: 'Decode, verify & sign tokens', icon: 'KeyRound', path: '/jwt', color: '#EF4444' },
  { id: 'meet', label: 'Meet', desc: 'Quick-join Google Meet calls', icon: 'Video', path: '/meet', color: '#22C55E' },
  { id: 'base64', label: 'Base64', desc: 'Encode & decode Base64', icon: 'FileCode2', path: '/base64', color: '#0891B2' },
  { id: 'timestamp', label: 'Timestamp', desc: 'Unix & ISO date conversion', icon: 'Clock', path: '/timestamp', color: '#CA8A04' },
  { id: 'hash', label: 'Hash Generator', desc: 'SHA-256, SHA-1, MD5 hashes', icon: 'Hash', path: '/hash', color: '#DC2626' },
  { id: 'regex', label: 'Regex Tester', desc: 'Test patterns with highlighting', icon: 'Regex', path: '/regex', color: '#9333EA' },
  { id: 'markdown', label: 'Markdown', desc: 'Live preview with editor', icon: 'FileText', path: '/markdown', color: '#16A34A' },
  { id: 'image', label: 'Image Tool', desc: 'Resize, compress & convert images', icon: 'Image', path: '/image', color: '#F97316' },
  { id: 'api', label: 'API Client', desc: 'HTTP request builder', icon: 'Send', path: '/api', color: '#06B6D4' },
]

const ICON_MAP = { QrCode, Braces, GitCompare, Table, Palette, KeyRound, Video, FileCode2, Clock, Hash, Regex, FileText, Image, Send }

export default function Dashboard() {
  const navigate = useNavigate()
  const deviceId = useDeviceId()
  const [savedQr] = useCloudState('qr-saved', [])
  const [savedColors] = useCloudState('color-saved', [])
  const [meetHistory] = useCloudState('meet-history', [])
  const [recentColors] = useCloudState('recent-colors', [])
  const [toolOrder, setToolOrder] = useCloudState('dashboard-tool-order', null)
  const [profile] = useCloudState('user-profile', { firstName: '', lastName: '', email: '', birthday: '' })
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [dragIdx, setDragIdx] = useState(null)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const tools = (() => {
    if (!toolOrder) return DEFAULT_TOOLS
    const ordered = []
    toolOrder.forEach((id) => {
      const t = DEFAULT_TOOLS.find((d) => d.id === id)
      if (t) ordered.push(t)
    })
    DEFAULT_TOOLS.forEach((t) => {
      if (!ordered.find((o) => o.id === t.id)) ordered.push(t)
    })
    return ordered
  })()

  useEffect(() => {
    const handler = (e) => { e.preventDefault(); setDeferredPrompt(e) }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const installPWA = useCallback(async () => {
    if (!deferredPrompt) {
      toast('Open this site in Chrome/Edge and look for the install icon in the address bar', { icon: '\u{1F4A1}' })
      return
    }
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') toast.success('Forge installed!')
    setDeferredPrompt(null)
  }, [deferredPrompt])

  const shareForge = useCallback(() => {
    if (!deviceId) { toast.error('No Forge ID found'); return }
    copyWithHistory(deviceId, 'Forge ID copied! Share it so others can import your data.')
  }, [deviceId])

  const now = new Date()
  const timeGreeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 18 ? 'Good afternoon' : 'Good evening'
  const userName = profile?.firstName ? `, ${profile.firstName}` : ''
  const greeting = `${timeGreeting}${userName}`

  const stats = [
    { label: 'Saved QR Codes', value: savedQr.length, color: '#00D4FF', path: '/qr' },
    { label: 'Saved Colors', value: savedColors.length, color: '#A855F7', path: '/color' },
    { label: 'Recent Meetings', value: meetHistory.length, color: '#22C55E', path: '/meet' },
    { label: 'Recent Colors', value: recentColors.length, color: '#EAB308', path: '/color' },
  ]

  const onDragStart = (e, idx) => { setDragIdx(idx); e.dataTransfer.effectAllowed = 'move'; e.currentTarget.style.opacity = '0.5' }
  const onDragEnd = (e) => { e.currentTarget.style.opacity = '1'; setDragIdx(null) }
  const onDragOver = (e) => e.preventDefault()
  const onDrop = (e, dropIdx) => {
    e.preventDefault()
    if (dragIdx === null || dragIdx === dropIdx) return
    const newTools = [...tools]
    const [dragged] = newTools.splice(dragIdx, 1)
    newTools.splice(dropIdx, 0, dragged)
    setToolOrder(newTools.map((t) => t.id))
    setDragIdx(null)
  }

  return (
    <div style={{ position: 'relative' }}>
      {/* Background: DotGrid is the default. To use Vanta + three instead, add `three` and `vanta`
          to package.json, then in a useEffect with a ref on this container call dynamic import()
          (e.g. await import('three'); await import('vanta/dist/vanta.net.min')) so those deps stay
          in an async chunk — do not add static top-level imports in this module. */}
      <div style={{ position: 'absolute', top: -32, left: -40, right: -40, height: 260, zIndex: 0, borderRadius: '0 0 16px 16px', overflow: 'hidden', opacity: 0.6 }}>
        <DotGrid />
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 80, background: 'linear-gradient(transparent, var(--bg))' }} />
      </div>

      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ marginBottom: 32, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <ForgeIcon size={56} />
            <div>
              <h1 style={{ fontSize: 28, fontWeight: 700, color: 'var(--text)', marginBottom: 4, fontFamily: 'var(--font-ui)' }}>
                {greeting}
              </h1>
              <p style={{ fontSize: 14, color: 'var(--text-muted)', fontFamily: 'var(--font-ui)', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                {now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                {deviceId && (
                  <button onClick={() => copyWithHistory(deviceId, 'Forge ID copied')}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'none', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '2px 8px', cursor: 'pointer', fontFamily: 'var(--font-code)', fontSize: 10, color: 'var(--text-muted)', transition: 'border-color 0.15s' }}
                    onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--accent)'}
                    onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}>
                    {deviceId} <Copy size={9} />
                  </button>
                )}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={shareForge} className="forge-btn" style={{ padding: '10px 14px', fontSize: 13 }}>
              <Share2 size={15} /> Share
            </button>
            {!isMobile && (
              <button onClick={installPWA} className="forge-btn forge-btn-primary" style={{ padding: '10px 18px', fontSize: 13 }}>
                <Download size={15} /> Install Forge
              </button>
            )}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 32 }}>
          {stats.map((s) => (
            <button key={s.label} onClick={() => navigate(s.path)} className="forge-card" style={{ padding: '20px 18px', textAlign: 'center', cursor: 'pointer', border: '1px solid var(--border)', transition: 'border-color 0.15s, transform 0.1s' }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = s.color; e.currentTarget.style.transform = 'translateY(-2px)' }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'none' }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: s.color, fontFamily: 'var(--font-code)', marginBottom: 4 }}>{s.value}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-ui)' }}>{s.label}</div>
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'var(--font-ui)' }}>Tools</h2>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', opacity: 0.5 }}>Drag to reorder</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
          {tools.map((tool, idx) => {
            const IconComp = ICON_MAP[tool.icon]
            return (
              <div key={tool.id} draggable onDragStart={(e) => onDragStart(e, idx)} onDragEnd={onDragEnd} onDragOver={onDragOver} onDrop={(e) => onDrop(e, idx)}
                onClick={() => navigate(tool.path)} className="forge-card"
                style={{ padding: '16px 18px', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14, border: '1px solid var(--border)', transition: 'border-color 0.15s, transform 0.1s' }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = tool.color; e.currentTarget.style.transform = 'translateY(-1px)' }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'none' }}>
                <GripVertical size={14} style={{ color: 'var(--text-muted)', opacity: 0.25, flexShrink: 0, cursor: 'grab' }} />
                <div style={{ width: 40, height: 40, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${tool.color}15`, color: tool.color, flexShrink: 0 }}>
                  {IconComp && <IconComp size={20} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', fontFamily: 'var(--font-ui)' }}>{tool.label}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{tool.desc}</div>
                </div>
                <ArrowRight size={14} style={{ color: 'var(--text-muted)', opacity: 0.3, flexShrink: 0 }} />
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
