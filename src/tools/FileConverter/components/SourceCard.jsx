import { File as FileIcon } from 'lucide-react'
import { FORMAT_LABELS, categoryFor } from '../constants'
import { formatBytes } from '../services/fileIO'

export default function SourceCard({ file, srcFormat }) {
  return (
    <div className="forge-card" style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 44, height: 44, borderRadius: 10, background: 'color-mix(in srgb, var(--accent) 12%, var(--bg))', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <FileIcon size={22} style={{ color: 'var(--accent)' }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {file.name}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-code)', display: 'flex', gap: 10, marginTop: 2 }}>
            <span>{formatBytes(file.size)}</span>
            {srcFormat && <span>• {FORMAT_LABELS[srcFormat] || srcFormat.toUpperCase()}</span>}
            {srcFormat && <span>• {categoryFor(srcFormat)}</span>}
          </div>
        </div>
      </div>
    </div>
  )
}
