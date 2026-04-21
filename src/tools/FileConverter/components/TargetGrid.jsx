import { Check, Laptop, Cloud } from 'lucide-react'
import { FORMAT_LABELS } from '../constants'

export default function TargetGrid({ targets, targetFormat, setTargetFormat, mode, disabled }) {
  if (!targets || targets.length === 0) {
    return <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>No conversion targets available.</div>
  }
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8 }}>
      {targets.map((t) => {
        const isActive = targetFormat === t.format
        const supported = mode === 'client' ? t.client : t.server
        return (
          <button
            key={t.format}
            type="button"
            onClick={() => setTargetFormat(t.format)}
            disabled={disabled}
            title={
              supported
                ? `Convert to ${FORMAT_LABELS[t.format] || t.format}`
                : `Only available in ${t.client ? 'Client' : 'Server'} mode`
            }
            style={{
              padding: '10px 12px', borderRadius: 'var(--radius)',
              cursor: disabled ? 'not-allowed' : 'pointer',
              border: isActive ? '2px solid var(--accent)' : '1px solid var(--border)',
              background: isActive ? 'color-mix(in srgb, var(--accent) 10%, var(--bg))' : 'var(--bg)',
              color: isActive ? 'var(--accent)' : 'var(--text)',
              fontSize: 13, fontWeight: isActive ? 600 : 500,
              fontFamily: 'var(--font-ui)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              transition: 'border 0.15s, background 0.15s',
              opacity: disabled ? 0.5 : supported ? 1 : 0.55,
              position: 'relative',
            }}
          >
            {isActive && <Check size={13} />}
            <span>{FORMAT_LABELS[t.format] || t.format.toUpperCase()}</span>
            <span style={{ display: 'flex', gap: 3, opacity: 0.65, marginLeft: 2 }}>
              {t.client && <Laptop size={10} />}
              {t.server && <Cloud size={10} />}
            </span>
          </button>
        )
      })}
    </div>
  )
}
