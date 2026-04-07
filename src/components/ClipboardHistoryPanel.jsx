import { useState } from 'react'
import { Clipboard, X, Copy } from 'lucide-react'
import toast from 'react-hot-toast'
import { useClipboardHistory } from '../contexts/ClipboardHistoryContext'

function preview(text, max = 120) {
  const t = text.replace(/\s+/g, ' ').trim()
  if (t.length <= max) return t
  return `${t.slice(0, max)}…`
}

export default function ClipboardHistoryPanel() {
  const { items, copyAgain } = useClipboardHistory()
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        aria-label="Clipboard history"
        onClick={() => setOpen((o) => !o)}
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          zIndex: 997,
          width: 48,
          height: 48,
          borderRadius: '50%',
          border: open ? '2px solid var(--accent)' : '1px solid var(--border)',
          background: 'var(--surface)',
          color: 'var(--text)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 8px 28px rgba(0,0,0,0.35)',
          transition: 'border-color 0.15s, transform 0.15s',
        }}
      >
        <Clipboard size={22} style={{ color: open ? 'var(--accent)' : 'var(--text-muted)' }} />
        {items.length > 0 && (
          <span
            style={{
              position: 'absolute',
              top: -4,
              right: -4,
              minWidth: 18,
              height: 18,
              padding: '0 5px',
              borderRadius: 9,
              background: 'var(--accent)',
              color: '#fff',
              fontSize: 10,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'var(--font-ui)',
            }}
          >
            {Math.min(items.length, 99)}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Clipboard history"
          style={{
            position: 'fixed',
            bottom: 88,
            right: 24,
            zIndex: 997,
            width: 'min(400px, calc(100vw - 32px))',
            maxHeight: 'min(420px, 55vh)',
            display: 'flex',
            flexDirection: 'column',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            boxShadow: '0 16px 48px rgba(0,0,0,0.45)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 14px',
              borderBottom: '1px solid var(--border)',
              fontSize: 13,
              fontWeight: 600,
              fontFamily: 'var(--font-ui)',
            }}
          >
            <span>Clipboard history</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
          <div style={{ overflowY: 'auto', padding: 8, flex: 1 }}>
            {items.length === 0 && (
              <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
                Copies from toolbar buttons and Cmd+C will appear here.
              </div>
            )}
            {items.map((text, i) => (
              <div
                key={`${i}-${text.slice(0, 24)}`}
                style={{
                  marginBottom: 6,
                  padding: '8px 10px',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  background: 'var(--bg)',
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    fontFamily: 'var(--font-code)',
                    lineHeight: 1.45,
                    color: 'var(--text)',
                    wordBreak: 'break-word',
                    marginBottom: 8,
                  }}
                >
                  {preview(text)}
                </div>
                <button
                  type="button"
                  className="forge-btn"
                  style={{ fontSize: 10, padding: '4px 8px', gap: 4 }}
                  onClick={() => {
                    copyAgain(text)
                    toast.success('Copied')
                  }}
                >
                  <Copy size={12} /> Copy again
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
