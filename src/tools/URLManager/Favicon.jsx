import { useState } from 'react'
import { Globe } from 'lucide-react'
import { faviconUrl } from './utils'

export default function Favicon({ url, size = 18 }) {
  const [failed, setFailed] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const src = faviconUrl(url)

  if (!src || failed) {
    return (
      <div style={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Globe size={size - 2} style={{ color: 'var(--text-muted)', opacity: 0.6 }} />
      </div>
    )
  }

  return (
    <div style={{ width: size, height: size, flexShrink: 0, position: 'relative' }}>
      {!loaded && (
        <div
          style={{
            position: 'absolute', inset: 0, borderRadius: 3,
            background: 'var(--border)',
            animation: 'forge-pulse 1.2s ease-in-out infinite',
          }}
        />
      )}
      <img
        src={src}
        alt=""
        width={size}
        height={size}
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
        style={{ width: size, height: size, borderRadius: 3, opacity: loaded ? 1 : 0, transition: 'opacity 0.2s' }}
      />
    </div>
  )
}
