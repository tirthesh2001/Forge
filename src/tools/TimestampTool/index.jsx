import { useState, useCallback, useEffect } from 'react'
import { Copy, Clock, RefreshCw, X } from 'lucide-react'
import toast from 'react-hot-toast'
import ToolHeader from '../../components/ToolHeader'

function TimestampRow({ label, value, onCopy }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 13, color: 'var(--text)', fontFamily: 'var(--font-code)' }}>{value}</span>
        <button type="button" onClick={() => onCopy(value)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 2 }}><Copy size={12} /></button>
      </div>
    </div>
  )
}

function timeAgo(ts) {
  const diff = Math.abs(Date.now() - ts)
  const s = Math.floor(diff / 1000)
  if (s < 60) return `${s} second${s !== 1 ? 's' : ''} ${ts > Date.now() ? 'from now' : 'ago'}`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m} minute${m !== 1 ? 's' : ''} ${ts > Date.now() ? 'from now' : 'ago'}`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} hour${h !== 1 ? 's' : ''} ${ts > Date.now() ? 'from now' : 'ago'}`
  const d = Math.floor(h / 24)
  return `${d} day${d !== 1 ? 's' : ''} ${ts > Date.now() ? 'from now' : 'ago'}`
}

export default function TimestampTool() {
  const [unixInput, setUnixInput] = useState('')
  const [dateInput, setDateInput] = useState('')
  const [liveNow, setLiveNow] = useState(null)

  useEffect(() => {
    setLiveNow(Date.now())
    const t = setInterval(() => setLiveNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  const parsedFromUnix = (() => {
    if (!unixInput.trim()) return null
    const num = Number(unixInput.trim())
    if (isNaN(num)) return null
    const ms = num > 1e12 ? num : num * 1000
    return new Date(ms)
  })()

  const parsedFromDate = (() => {
    if (!dateInput.trim()) return null
    const d = new Date(dateInput.trim())
    return isNaN(d.getTime()) ? null : d
  })()

  const fillNow = useCallback(() => {
    const now = Math.floor(Date.now() / 1000)
    setUnixInput(now.toString())
  }, [])

  const copyText = useCallback((t) => {
    navigator.clipboard.writeText(t)
    toast.success('Copied')
  }, [])

  const inputStyle = {
    background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius)',
    padding: '12px 16px', color: 'var(--text)', fontFamily: 'var(--font-code)', fontSize: 14,
    outline: 'none', width: '100%',
  }

  return (
    <div>
      <ToolHeader toolId="timestamp" title="Timestamp Converter" description="Convert between Unix timestamps and human-readable dates" />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        <div className="forge-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Unix Timestamp</span>
            <button onClick={fillNow} className="forge-btn" style={{ padding: '4px 10px', fontSize: 11 }}><RefreshCw size={11} /> Now</button>
          </div>
          <input value={unixInput} onChange={(e) => setUnixInput(e.target.value)} placeholder="e.g. 1700000000" style={inputStyle} />
          {parsedFromUnix && (
            <div style={{ marginTop: 16 }}>
              <TimestampRow label="ISO 8601" value={parsedFromUnix.toISOString()} onCopy={copyText} />
              <TimestampRow label="UTC" value={parsedFromUnix.toUTCString()} onCopy={copyText} />
              <TimestampRow label="Local" value={parsedFromUnix.toLocaleString()} onCopy={copyText} />
              <TimestampRow label="Relative" value={timeAgo(parsedFromUnix.getTime())} onCopy={copyText} />
              <TimestampRow label="Milliseconds" value={parsedFromUnix.getTime().toString()} onCopy={copyText} />
            </div>
          )}
          {unixInput && !parsedFromUnix && (
            <div style={{ marginTop: 12, fontSize: 12, color: '#EF4444' }}>Invalid timestamp</div>
          )}
        </div>

        <div className="forge-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Date String</span>
            {dateInput && (
              <button onClick={() => setDateInput('')} className="forge-btn" style={{ padding: '4px 10px', fontSize: 11 }}><X size={11} /> Clear</button>
            )}
          </div>
          <input type="datetime-local" value={dateInput} onChange={(e) => setDateInput(e.target.value)} style={inputStyle} />
          {parsedFromDate && (
            <div style={{ marginTop: 16 }}>
              <TimestampRow label="Unix (seconds)" value={Math.floor(parsedFromDate.getTime() / 1000).toString()} onCopy={copyText} />
              <TimestampRow label="Unix (ms)" value={parsedFromDate.getTime().toString()} onCopy={copyText} />
              <TimestampRow label="ISO 8601" value={parsedFromDate.toISOString()} onCopy={copyText} />
              <TimestampRow label="Relative" value={timeAgo(parsedFromDate.getTime())} onCopy={copyText} />
            </div>
          )}
        </div>
      </div>

      <div className="forge-card" style={{ textAlign: 'center', padding: '16px 24px' }}>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Current Time</div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 32, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--accent)', fontFamily: 'var(--font-code)' }}>{liveNow == null ? '—' : Math.floor(liveNow / 1000)}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Unix</div>
          </div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--font-code)' }}>{liveNow == null ? '—' : new Date(liveNow).toLocaleTimeString()}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Local</div>
          </div>
        </div>
      </div>
    </div>
  )
}
