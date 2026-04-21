import { AlertCircle } from 'lucide-react'

const TITLE_BY_TYPE = {
  size: 'File too large',
  unsupported: 'Unsupported format',
  convert: 'Conversion failed',
  mode: 'Not available',
  config: 'Server conversion not configured',
}

export default function ErrorBanner({ error, onAction, actionLabel }) {
  if (!error) return null
  return (
    <div style={{ display: 'flex', gap: 10, padding: 14, marginBottom: 12, borderRadius: 'var(--radius)', border: '1px solid rgba(239,68,68,0.35)', background: 'rgba(239,68,68,0.06)' }}>
      <AlertCircle size={18} style={{ color: '#EF4444', flexShrink: 0, marginTop: 1 }} />
      <div style={{ fontSize: 13, lineHeight: 1.5, flex: 1, color: 'var(--text)' }}>
        <div style={{ fontWeight: 600, marginBottom: 4 }}>{TITLE_BY_TYPE[error.type] || 'Something went wrong'}</div>
        <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>{error.message}</div>
      </div>
      {onAction && actionLabel && (
        <button onClick={onAction} className="forge-btn" style={{ fontSize: 12, padding: '6px 10px', alignSelf: 'flex-start' }}>
          {actionLabel}
        </button>
      )}
    </div>
  )
}
