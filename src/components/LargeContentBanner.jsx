import { AlertTriangle, X } from 'lucide-react'
import { useState } from 'react'
import { WARN_DOCUMENT_BYTES } from '../constants/storageLimits'
import formatBytes from '../utils/formatBytes'

/** Non-dismissible by default; pass dismissible to allow hiding for the session. */
export default function LargeContentBanner({ byteSize, dismissible = false }) {
  const [dismissed, setDismissed] = useState(false)
  if (byteSize <= WARN_DOCUMENT_BYTES || (dismissible && dismissed)) return null

  return (
    <div
      role="status"
      className="flex items-start gap-3"
      style={{
        padding: '10px 14px',
        marginBottom: 12,
        borderRadius: 'var(--radius)',
        border: '1px solid color-mix(in srgb, #EAB308 40%, var(--border))',
        background: 'color-mix(in srgb, #EAB308 12%, var(--surface))',
        fontSize: 12,
        color: 'var(--text)',
      }}
    >
      <AlertTriangle size={16} style={{ color: '#EAB308', flexShrink: 0, marginTop: 2 }} />
      <div style={{ flex: 1, minWidth: 0, lineHeight: 1.5 }}>
        <strong style={{ display: 'block', marginBottom: 4 }}>Large document ({formatBytes(byteSize)})</strong>
        The editor may feel slow. Documents over {formatBytes(WARN_DOCUMENT_BYTES)} are not recommended for this browser workspace.
        Very large content may not sync to cloud storage—export important work.
      </div>
      {dismissible && (
        <button
          type="button"
          aria-label="Dismiss"
          className="cursor-pointer"
          style={{ background: 'none', border: 'none', padding: 4, color: 'var(--text-muted)' }}
          onClick={() => setDismissed(true)}
        >
          <X size={16} />
        </button>
      )}
    </div>
  )
}
