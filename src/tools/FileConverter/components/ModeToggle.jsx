import { Laptop, Cloud, Lock } from 'lucide-react'
import { hasServerConfig } from '../services'

export default function ModeToggle({ mode, setMode, clientSupported, serverSupported, disabled }) {
  const serverReady = hasServerConfig()

  return (
    <div style={{ display: 'flex', gap: 8, padding: 4, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
      <Btn
        active={mode === 'client'}
        disabled={disabled || !clientSupported}
        onClick={() => setMode('client')}
        title={!clientSupported ? 'Client conversion is not available for this pair.' : 'Runs entirely in your browser. No upload.'}
      >
        <Laptop size={13} /> Client
        {!clientSupported && <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 4 }}>(n/a)</span>}
      </Btn>
      <Btn
        active={mode === 'server'}
        disabled={disabled || !serverSupported}
        onClick={() => setMode('server')}
        title={!serverSupported ? 'Server conversion is not available for this pair.' : serverReady ? 'Uses CloudConvert API.' : 'Requires CloudConvert API key in Settings.'}
      >
        <Cloud size={13} /> Server
        {!serverReady && serverSupported && <Lock size={11} style={{ opacity: 0.7 }} />}
        {!serverSupported && <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 4 }}>(n/a)</span>}
      </Btn>
    </div>
  )
}

function Btn({ active, children, onClick, disabled, title }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '6px 12px', fontSize: 12, fontFamily: 'var(--font-ui)',
        background: active ? 'color-mix(in srgb, var(--accent) 14%, var(--bg))' : 'transparent',
        color: active ? 'var(--accent)' : 'var(--text-muted)',
        border: active ? '1px solid var(--accent)' : '1px solid transparent',
        borderRadius: 6, cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.45 : 1, fontWeight: active ? 600 : 500,
        transition: 'background 0.15s, color 0.15s, border-color 0.15s',
      }}
    >
      {children}
    </button>
  )
}
