import { useState, useCallback, useMemo } from 'react'
import { ExternalLink, Clock, Trash2, Video, Copy } from 'lucide-react'
import toast from 'react-hot-toast'
import useCloudState from '../../hooks/useCloudState'
import ToolHeader from '../../components/ToolHeader'
import { copyWithHistory } from '../../utils/copyWithHistory'

function parseMeetCode(input) {
  if (!input.trim()) return null
  const trimmed = input.trim()

  const urlMatch = trimmed.match(/meet\.google\.com\/([a-z]{3}-[a-z]{4}-[a-z]{3})/i)
  if (urlMatch) return urlMatch[1].toLowerCase()

  const codeMatch = trimmed.match(/^([a-z]{3}-[a-z]{4}-[a-z]{3})$/i)
  if (codeMatch) return codeMatch[1].toLowerCase()

  const rawMatch = trimmed.match(/^([a-z]{10,12})$/i)
  if (rawMatch) {
    const raw = rawMatch[1].toLowerCase()
    if (raw.length === 10) return `${raw.slice(0, 3)}-${raw.slice(3, 7)}-${raw.slice(7)}`
  }

  return null
}

function timeAgo(dateStr) {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export default function MeetTool() {
  const [input, setInput] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [history, setHistory] = useCloudState('meet-history', [])

  const parsed = useMemo(() => parseMeetCode(input), [input])
  const meetUrl = parsed ? `https://meet.google.com/${parsed}` : null

  const joinMeeting = useCallback(() => {
    if (!parsed) return
    const entry = {
      id: Date.now().toString(36),
      code: parsed,
      displayName: displayName.trim() || 'Guest',
      joinedAt: new Date().toISOString(),
    }
    setHistory((prev) => [entry, ...prev.filter((h) => h.code !== parsed).slice(0, 19)])
    window.open(meetUrl, '_blank')
    toast.success('Opening Google Meet...')
  }, [parsed, displayName, meetUrl])

  const rejoin = useCallback((code) => {
    window.open(`https://meet.google.com/${code}`, '_blank')
    toast.success('Opening Google Meet...')
  }, [])

  const removeEntry = useCallback((id) => {
    setHistory((prev) => prev.filter((h) => h.id !== id))
  }, [])

  const clearHistory = useCallback(() => {
    setHistory([])
    toast.success('History cleared')
  }, [])

  const inputStyle = {
    background: 'var(--bg)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    padding: '12px 16px',
    color: 'var(--text)',
    fontSize: 14,
    outline: 'none',
    width: '100%',
    fontFamily: 'var(--font-ui)',
  }

  return (
    <div>
      <ToolHeader toolId="meet" title="Google Meet" description="Quick-join Google Meet calls" />

      <div className="forge-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: 24 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Meeting URL or Code
              </label>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="meet.google.com/abc-defg-hij or abc-defg-hij"
                onKeyDown={(e) => e.key === 'Enter' && parsed && joinMeeting()}
                style={{ ...inputStyle, fontFamily: 'var(--font-code)' }}
              />
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Display Name (optional)
              </label>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
                style={inputStyle}
              />
            </div>
          </div>

          {parsed && (
            <div style={{
              marginTop: 16, padding: '12px 16px', background: 'color-mix(in srgb, var(--accent) 6%, var(--bg))',
              border: '1px solid color-mix(in srgb, var(--accent) 20%, var(--border))',
              borderRadius: 'var(--radius)', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <span style={{ fontSize: 13, fontFamily: 'var(--font-code)', color: 'var(--accent)' }}>
                meet.google.com/{parsed}
              </span>
              <button onClick={() => copyWithHistory(meetUrl)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <Copy size={14} />
              </button>
            </div>
          )}
        </div>

        <div style={{ padding: '14px 24px', borderTop: '1px solid var(--border)' }}>
          <button
            onClick={joinMeeting}
            disabled={!parsed}
            className="forge-btn forge-btn-primary"
            style={{ padding: '10px 24px', fontSize: 14 }}
          >
            <ExternalLink size={15} /> Join Meeting
          </button>
        </div>
      </div>

      {/* Recent Meetings */}
      {history.length > 0 && (
        <div className="forge-card" style={{ marginTop: 16, padding: 0, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Recent Meetings
            </span>
            <button onClick={clearHistory} className="forge-btn" style={{ padding: '3px 8px', fontSize: 11 }}>
              <Trash2 size={11} /> Clear
            </button>
          </div>
          <div>
            {history.map((entry, i) => (
              <div key={entry.id} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px',
                borderBottom: i < history.length - 1 ? '1px solid var(--border)' : 'none',
                background: i % 2 === 0 ? 'transparent' : 'var(--surface-hover)',
              }}>
                <Video size={16} style={{ color: 'var(--accent)', flexShrink: 0, opacity: 0.7 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontFamily: 'var(--font-code)', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {entry.code}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', gap: 8, alignItems: 'center', marginTop: 2 }}>
                    <span>{entry.displayName}</span>
                    <span style={{ opacity: 0.5 }}>&middot;</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                      <Clock size={10} /> {timeAgo(entry.joinedAt)}
                    </span>
                  </div>
                </div>
                <button onClick={() => rejoin(entry.code)} className="forge-btn forge-btn-primary" style={{ padding: '5px 12px', fontSize: 11 }}>
                  <ExternalLink size={11} /> Join
                </button>
                <button onClick={() => removeEntry(entry.id)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4, opacity: 0.5 }}>
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
