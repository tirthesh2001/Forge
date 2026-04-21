import { Check, Download } from 'lucide-react'
import { formatBytes, downloadBlob } from '../services/fileIO'

export default function ResultCard({ result }) {
  if (!result) return null
  const { blob, filename } = result
  return (
    <div className="forge-card" style={{ marginBottom: 12, border: '1px solid rgba(34,197,94,0.35)', background: 'rgba(34,197,94,0.04)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 44, height: 44, borderRadius: 10, background: 'rgba(34,197,94,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Check size={22} style={{ color: '#22C55E' }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {filename}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-code)', marginTop: 2 }}>
            {formatBytes(blob.size)} • Ready to download
          </div>
        </div>
        <button onClick={() => downloadBlob(blob, filename)} className="forge-btn forge-btn-primary" style={{ padding: '10px 18px', fontSize: 13, gap: 6 }}>
          <Download size={14} /> Download
        </button>
      </div>
    </div>
  )
}
