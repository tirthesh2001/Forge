import DropZone from '../../../components/DropZone'
import ForgeEmptyState from '../../../components/ForgeEmptyState'
import { FileInput } from 'lucide-react'
import { FORMAT_CATEGORIES } from '../constants'

export default function UploadStep({ onFile }) {
  return (
    <>
      <ForgeEmptyState
        icon={FileInput}
        title="Drop a file to convert"
        description="Client-side converts images, PDFs, Word docs, and data formats. Server-side (optional CloudConvert key) unlocks audio, video, Office docs, archives, and more."
      />
      <div className="forge-card" style={{ padding: 24, marginTop: 16 }}>
        <DropZone onFile={onFile} label="Drop a file here or click to browse" />
        <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
          {Object.entries(FORMAT_CATEGORIES).map(([key, cat]) => (
            <div key={key} style={{ padding: 12, border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--bg)' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>{cat.label}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {cat.formats.map((f) => (
                  <span key={f} style={{ fontSize: 10, fontFamily: 'var(--font-code)', padding: '2px 6px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 3, color: 'var(--text-muted)' }}>
                    {f.toUpperCase()}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
