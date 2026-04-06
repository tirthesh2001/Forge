import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const STORAGE_KEY = 'forge-device-id'
const DeviceContext = createContext(null)

function generateId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return `FORGE-${code}`
}

export function DeviceProvider({ children }) {
  const [deviceId, setDeviceId] = useState(() => localStorage.getItem(STORAGE_KEY) || '')
  const [needsReconnect, setNeedsReconnect] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      setDeviceId(stored)
      setLoading(false)
    } else {
      setNeedsReconnect(true)
      setLoading(false)
    }
  }, [])

  const createNewDevice = () => {
    const id = generateId()
    localStorage.setItem(STORAGE_KEY, id)
    setDeviceId(id)
    setNeedsReconnect(false)
  }

  const reconnect = async (id) => {
    const trimmed = id.trim().toUpperCase()
    if (!trimmed) return false
    const formatted = trimmed.startsWith('FORGE-') ? trimmed : `FORGE-${trimmed}`
    try {
      const { data } = await supabase
        .from('forge_data')
        .select('id')
        .eq('device_id', formatted)
        .limit(1)
      if (data && data.length > 0) {
        localStorage.setItem(STORAGE_KEY, formatted)
        setDeviceId(formatted)
        setNeedsReconnect(false)
        return true
      }
      return false
    } catch {
      return false
    }
  }

  if (loading) return null

  if (needsReconnect) {
    return <ReconnectScreen onCreate={createNewDevice} onReconnect={reconnect} />
  }

  return (
    <DeviceContext.Provider value={{ deviceId }}>
      {children}
    </DeviceContext.Provider>
  )
}

export function useDeviceId() {
  const ctx = useContext(DeviceContext)
  if (!ctx) throw new Error('useDeviceId must be used within DeviceProvider')
  return ctx.deviceId
}

function ReconnectScreen({ onCreate, onReconnect }) {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [checking, setChecking] = useState(false)

  const handleReconnect = async () => {
    if (!code.trim()) return
    setChecking(true)
    setError('')
    const ok = await onReconnect(code)
    setChecking(false)
    if (!ok) setError('No data found for that ID. Check the code and try again.')
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg)',
      fontFamily: 'var(--font-ui)',
      padding: 24,
    }}>
      <div style={{
        width: '100%',
        maxWidth: 420,
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        padding: 32,
        textAlign: 'center',
      }}>
        <span style={{ fontSize: 32, display: 'block', marginBottom: 12 }}>🔨</span>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>Welcome to Forge</h1>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 28, lineHeight: 1.5 }}>
          Start fresh or enter your Forge ID to restore saved data.
        </p>

        <button
          onClick={onCreate}
          className="forge-btn forge-btn-primary"
          style={{ width: '100%', justifyContent: 'center', padding: '12px 0', fontSize: 14, marginBottom: 20 }}
        >
          Create New Workspace
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>or reconnect</span>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={code}
            onChange={(e) => { setCode(e.target.value.toUpperCase()); setError('') }}
            placeholder="FORGE-XXXXXX"
            onKeyDown={(e) => e.key === 'Enter' && handleReconnect()}
            style={{
              flex: 1,
              background: 'var(--bg)',
              color: 'var(--text)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              padding: '10px 14px',
              fontFamily: 'var(--font-code)',
              fontSize: 13,
              outline: 'none',
              letterSpacing: '0.05em',
            }}
          />
          <button
            onClick={handleReconnect}
            disabled={checking || !code.trim()}
            className="forge-btn"
            style={{ padding: '10px 18px', fontSize: 13 }}
          >
            {checking ? '...' : 'Restore'}
          </button>
        </div>

        {error && (
          <p style={{ fontSize: 12, color: '#EF4444', marginTop: 10, textAlign: 'left' }}>{error}</p>
        )}
      </div>
    </div>
  )
}
