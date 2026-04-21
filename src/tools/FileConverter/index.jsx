import { useEffect } from 'react'
import { X, RefreshCw, ArrowRight, Info } from 'lucide-react'
import ToolHeader from '../../components/ToolHeader'
import useConversion from './hooks/useConversion'
import UploadStep from './components/UploadStep'
import SourceCard from './components/SourceCard'
import ErrorBanner from './components/ErrorBanner'
import ModeToggle from './components/ModeToggle'
import TargetGrid from './components/TargetGrid'
import ResultCard from './components/ResultCard'
import { FORMAT_LABELS } from './constants'

const IMAGE_FORMATS = new Set(['png', 'jpeg', 'webp', 'gif', 'bmp', 'ico', 'avif', 'tiff'])

export default function FileConverter() {
  const {
    file, srcFormat, targetFormat, mode, quality, result, error, converting, progress, targets,
    setTargetFormat, setMode, setQuality, loadFile, doConvert, reset,
  } = useConversion()

  // Auto-select first available target when source changes
  useEffect(() => {
    if (!targets.length) return
    if (targetFormat && targets.find((t) => t.format === targetFormat)) return
    const preferred = targets.find((t) => (mode === 'client' ? t.client : t.server)) || targets[0]
    setTargetFormat(preferred.format)
  }, [targets, targetFormat, mode, setTargetFormat])

  // Auto-switch mode if current mode doesn't support the selected target
  useEffect(() => {
    if (!targetFormat) return
    const t = targets.find((x) => x.format === targetFormat)
    if (!t) return
    if (mode === 'client' && !t.client && t.server) setMode('server')
    if (mode === 'server' && !t.server && t.client) setMode('client')
  }, [targetFormat, targets, mode, setMode])

  if (!file) {
    return (
      <div>
        <ToolHeader toolId="converter" title="File Converter" description="Convert any file — client-side in your browser or server-side via CloudConvert" />
        <UploadStep onFile={loadFile} />
      </div>
    )
  }

  const currentTarget = targets.find((t) => t.format === targetFormat)
  const isImageConversion = srcFormat && IMAGE_FORMATS.has(srcFormat) && targetFormat && IMAGE_FORMATS.has(targetFormat)

  return (
    <div>
      <ToolHeader toolId="converter" title="File Converter" description="Convert any file — client-side in your browser or server-side via CloudConvert">
        <button onClick={reset} className="forge-btn" style={{ fontSize: 12, padding: '6px 12px', gap: 4 }}>
          <X size={14} /> New file
        </button>
      </ToolHeader>

      <SourceCard file={file} srcFormat={srcFormat} />
      <ErrorBanner error={error} />

      {srcFormat && targets.length > 0 && (
        <div className="forge-card" style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Convert to
            </div>
            <ModeToggle
              mode={mode}
              setMode={setMode}
              clientSupported={!!currentTarget?.client}
              serverSupported={!!currentTarget?.server}
              disabled={converting}
            />
          </div>

          <TargetGrid
            targets={targets}
            targetFormat={targetFormat}
            setTargetFormat={setTargetFormat}
            mode={mode}
            disabled={converting}
          />

          {isImageConversion && mode === 'client' && (
            <div style={{ marginTop: 14, padding: 12, background: 'var(--bg)', borderRadius: 6, border: '1px solid var(--border)' }}>
              <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ minWidth: 70 }}>Quality</span>
                <input
                  type="range" min={0.1} max={1} step={0.05}
                  value={quality} onChange={(e) => setQuality(Number(e.target.value))}
                  disabled={converting}
                  style={{ flex: 1, accentColor: 'var(--accent)' }}
                />
                <span style={{ fontFamily: 'var(--font-code)', fontSize: 12, color: 'var(--text)', minWidth: 40, textAlign: 'right' }}>
                  {Math.round(quality * 100)}%
                </span>
              </label>
            </div>
          )}

          <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <button
              onClick={doConvert}
              disabled={converting || !targetFormat}
              className="forge-btn forge-btn-primary"
              style={{ padding: '10px 20px', fontSize: 13, gap: 6, opacity: converting ? 0.7 : 1, cursor: converting ? 'wait' : 'pointer' }}
            >
              {converting ? (
                <>
                  <RefreshCw size={14} style={{ animation: 'forge-spin 0.8s linear infinite' }} />
                  {progress.phase === 'uploading' ? 'Uploading…' : progress.phase === 'converting' ? 'Converting…' : progress.phase === 'downloading' ? 'Downloading…' : 'Working…'}
                </>
              ) : (
                <>
                  <ArrowRight size={14} /> Convert to {FORMAT_LABELS[targetFormat] || targetFormat?.toUpperCase()}
                </>
              )}
            </button>
            {converting && (
              <div style={{ flex: 1, minWidth: 180, maxWidth: 320 }}>
                <div style={{ height: 4, background: 'var(--bg)', borderRadius: 2, overflow: 'hidden', border: '1px solid var(--border)' }}>
                  <div style={{ width: `${progress.pct || 0}%`, height: '100%', background: 'var(--accent)', transition: 'width 0.3s' }} />
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4, fontFamily: 'var(--font-code)' }}>
                  {progress.phase} · {progress.pct || 0}%
                </div>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 12, fontSize: 11, color: 'var(--text-muted)' }}>
            <Info size={12} />
            {mode === 'client'
              ? <span>Client mode runs locally in your browser. Nothing is uploaded.</span>
              : <span>Server mode uploads to CloudConvert over TLS. File is deleted from CloudConvert after conversion.</span>}
          </div>
        </div>
      )}

      <ResultCard result={result} />

      <style>{`@keyframes forge-spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
