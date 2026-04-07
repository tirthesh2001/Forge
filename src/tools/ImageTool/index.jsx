import { useState, useEffect, useCallback, useRef } from 'react'
import toast from 'react-hot-toast'
import { Download, RotateCcw, Lock, Unlock, Image as ImageIcon, Target, Percent } from 'lucide-react'
import DropZone from '../../components/DropZone'
import ToolHeader from '../../components/ToolHeader'

function formatBytes(bytes) {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / k ** i).toFixed(i > 1 ? 2 : 1))} ${sizes[i]}`
}

function clampDim(n) {
  return Math.max(1, Math.min(16384, Math.round(Number(n) || 1)))
}

function mimeForFormat(fmt) {
  if (fmt === 'jpeg') return 'image/jpeg'
  if (fmt === 'webp') return 'image/webp'
  return 'image/png'
}

export default function ImageTool() {
  const [file, setFile] = useState(null)
  const [objectUrl, setObjectUrl] = useState(null)
  const [natural, setNatural] = useState({ w: 0, h: 0 })
  const [targetW, setTargetW] = useState(0)
  const [targetH, setTargetH] = useState(0)
  const [aspectLock, setAspectLock] = useState(true)
  const [quality, setQuality] = useState(85)
  const [outputFormat, setOutputFormat] = useState('webp')
  const [tab, setTab] = useState('resize')
  const [processedBlob, setProcessedBlob] = useState(null)
  const [processedUrl, setProcessedUrl] = useState(null)
  const [processing, setProcessing] = useState(false)
  const [compressMode, setCompressMode] = useState('percentage')
  const [targetSizeValue, setTargetSizeValue] = useState('')
  const [targetSizeUnit, setTargetSizeUnit] = useState('KB')
  const [targetSizeStatus, setTargetSizeStatus] = useState(null)
  const [targetSizeProcessing, setTargetSizeProcessing] = useState(false)
  const revokeProcessed = useRef(null)

  useEffect(() => {
    if (!file) {
      setObjectUrl(null)
      return
    }
    const url = URL.createObjectURL(file)
    setObjectUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  useEffect(() => {
    if (!objectUrl) {
      setNatural({ w: 0, h: 0 })
      return
    }
    const img = new Image()
    img.onload = () => {
      const w = img.naturalWidth
      const h = img.naturalHeight
      setNatural({ w, h })
      setTargetW(w)
      setTargetH(h)
    }
    img.onerror = () => toast.error('Could not read image')
    img.src = objectUrl
  }, [objectUrl])

  const aspectRatio = natural.w > 0 ? natural.w / natural.h : 1

  const setWidthLocked = useCallback((raw) => {
    const w = clampDim(raw)
    setTargetW(w)
    if (aspectLock) setTargetH(clampDim(w / aspectRatio))
  }, [aspectLock, aspectRatio])

  const setHeightLocked = useCallback((raw) => {
    const h = clampDim(raw)
    setTargetH(h)
    if (aspectLock) setTargetW(clampDim(h * aspectRatio))
  }, [aspectLock, aspectRatio])

  const toggleAspectLock = useCallback(() => {
    setAspectLock((locked) => {
      if (!locked) {
        setTargetW((w) => {
          const cw = clampDim(w)
          setTargetH(clampDim(cw / aspectRatio))
          return cw
        })
      }
      return !locked
    })
  }, [aspectRatio])

  useEffect(() => {
    if (!objectUrl || !natural.w) {
      setProcessedBlob(null)
      setProcessedUrl(null)
      if (revokeProcessed.current) {
        URL.revokeObjectURL(revokeProcessed.current)
        revokeProcessed.current = null
      }
      return
    }

    let cancelled = false
    setProcessing(true)

    const img = new Image()
    img.onload = () => {
      const tw = clampDim(targetW)
      const th = clampDim(targetH)
      const canvas = document.createElement('canvas')
      canvas.width = tw
      canvas.height = th
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        setProcessing(false)
        toast.error('Canvas not available')
        return
      }
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(img, 0, 0, tw, th)

      const mime = mimeForFormat(outputFormat)
      const q = quality / 100

      const finish = (blob) => {
        if (cancelled) return
        setProcessing(false)
        if (!blob) {
          toast.error('Export failed')
          return
        }
        setProcessedBlob(blob)
        if (revokeProcessed.current) URL.revokeObjectURL(revokeProcessed.current)
        const next = URL.createObjectURL(blob)
        revokeProcessed.current = next
        setProcessedUrl(next)
      }

      if (mime === 'image/png') {
        canvas.toBlob((blob) => finish(blob), 'image/png')
      } else {
        canvas.toBlob((blob) => finish(blob), mime, q)
      }
    }
    img.onerror = () => {
      if (!cancelled) {
        setProcessing(false)
        toast.error('Failed to process image')
      }
    }
    img.src = objectUrl

    return () => {
      cancelled = true
    }
  }, [objectUrl, natural.w, targetW, targetH, quality, outputFormat])

  useEffect(() => () => {
    if (revokeProcessed.current) URL.revokeObjectURL(revokeProcessed.current)
  }, [])

  const handleFile = useCallback((f) => {
    if (!f?.type?.startsWith('image/')) {
      toast.error('Please drop an image file')
      return
    }
    setFile(f)
    setTab('resize')
  }, [])

  const compressToTargetSize = useCallback(async () => {
    if (!objectUrl || !natural.w || outputFormat === 'png') return
    const targetBytes = parseFloat(targetSizeValue) * (targetSizeUnit === 'MB' ? 1024 * 1024 : 1024)
    if (!targetBytes || targetBytes <= 0) {
      toast.error('Enter a valid target size')
      return
    }
    setTargetSizeProcessing(true)
    setTargetSizeStatus('Compressing...')

    const img = new window.Image()
    img.src = objectUrl
    await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject })

    const tw = clampDim(targetW)
    const th = clampDim(targetH)
    const canvas = document.createElement('canvas')
    canvas.width = tw
    canvas.height = th
    const ctx = canvas.getContext('2d')
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(img, 0, 0, tw, th)

    const mime = mimeForFormat(outputFormat)
    const toBlob = (q) => new Promise((resolve) => canvas.toBlob(resolve, mime, q))

    let lo = 0.01, hi = 1.0, bestBlob = null, bestQ = 0.5
    const tolerance = 0.08

    for (let i = 0; i < 12; i++) {
      const mid = (lo + hi) / 2
      const blob = await toBlob(mid)
      if (!blob) break
      bestBlob = blob
      bestQ = mid
      const ratio = blob.size / targetBytes
      if (Math.abs(ratio - 1) < tolerance) break
      if (blob.size > targetBytes) hi = mid
      else lo = mid
    }

    if (bestBlob) {
      setProcessedBlob(bestBlob)
      if (revokeProcessed.current) URL.revokeObjectURL(revokeProcessed.current)
      const next = URL.createObjectURL(bestBlob)
      revokeProcessed.current = next
      setProcessedUrl(next)
      setQuality(Math.round(bestQ * 100))
      const achieved = bestBlob.size < 1024
        ? `${bestBlob.size} B`
        : bestBlob.size < 1024 * 1024
          ? `${(bestBlob.size / 1024).toFixed(1)} KB`
          : `${(bestBlob.size / (1024 * 1024)).toFixed(2)} MB`
      setTargetSizeStatus(`Achieved: ${achieved}`)
    } else {
      setTargetSizeStatus('Could not reach target')
      toast.error('Compression failed')
    }
    setTargetSizeProcessing(false)
  }, [objectUrl, natural.w, targetW, targetH, outputFormat, targetSizeValue, targetSizeUnit])

  const resetAll = useCallback(() => {
    setFile(null)
    setNatural({ w: 0, h: 0 })
    setTargetW(0)
    setTargetH(0)
    setProcessedBlob(null)
    setProcessedUrl(null)
    if (revokeProcessed.current) {
      URL.revokeObjectURL(revokeProcessed.current)
      revokeProcessed.current = null
    }
    setQuality(85)
    setOutputFormat('webp')
    setAspectLock(true)
    setCompressMode('percentage')
    setTargetSizeValue('')
    setTargetSizeUnit('KB')
    setTargetSizeStatus(null)
  }, [])

  const download = useCallback(() => {
    if (!processedBlob || !file) return
    const base = file.name.replace(/\.[^/.]+$/, '') || 'image'
    const ext = outputFormat === 'jpeg' ? 'jpg' : outputFormat
    const a = document.createElement('a')
    a.href = processedUrl
    a.download = `${base}-forge.${ext}`
    a.click()
    toast.success('Download started')
  }, [processedBlob, processedUrl, file, outputFormat])

  const inputStyle = {
    width: '100%',
    padding: '8px 12px',
    fontSize: 13,
    fontFamily: 'var(--font-code)',
    color: 'var(--text)',
    background: 'var(--bg)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    outline: 'none',
  }

  const labelStyle = {
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--text-muted)',
    fontFamily: 'var(--font-ui)',
    marginBottom: 6,
    display: 'block',
  }

  const previewBox = {
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    background: 'var(--bg)',
    padding: 12,
    minHeight: 200,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  }

  const originalSize = file?.size ?? 0
  const processedSize = processedBlob?.size ?? 0
  const savings = originalSize > 0 && processedSize > 0
    ? Math.round((1 - processedSize / originalSize) * 100)
    : null

  return (
    <div>
      <ToolHeader
        toolId="image"
        title="Image Tool"
        description="Resize, compress and convert images"
      />

      {!file && (
        <div className="forge-card" style={{ marginBottom: 20 }}>
          <DropZone
            onFile={handleFile}
            accept="image/*"
            label="Drop an image here or click to browse"
          />
        </div>
      )}

      {file && (
        <div
          className="image-tool-grid"
          style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 380px) 1fr', gap: 20, alignItems: 'start' }}
        >
          <div className="forge-card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                <ImageIcon size={18} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-ui)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {file.name}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" className="forge-btn" onClick={resetAll} title="Clear and start over">
                  <RotateCcw size={14} />
                  Reset
                </button>
                <button
                  type="button"
                  className="forge-btn forge-btn-primary"
                  onClick={download}
                  disabled={!processedBlob || processing}
                >
                  <Download size={14} />
                  Download
                </button>
              </div>
            </div>

            <div className="tab-pills">
              <button type="button" className={`tab-pill ${tab === 'resize' ? 'active' : ''}`} onClick={() => setTab('resize')}>
                Resize
              </button>
              <button type="button" className={`tab-pill ${tab === 'compress' ? 'active' : ''}`} onClick={() => setTab('compress')}>
                Compress
              </button>
              <button type="button" className={`tab-pill ${tab === 'format' ? 'active' : ''}`} onClick={() => setTab('format')}>
                Format
              </button>
            </div>

            {tab === 'resize' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={labelStyle}>Width (px)</label>
                    <input
                      type="number"
                      min={1}
                      max={16384}
                      value={targetW || ''}
                      onChange={(e) => setWidthLocked(e.target.value)}
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Height (px)</label>
                    <input
                      type="number"
                      min={1}
                      max={16384}
                      value={targetH || ''}
                      onChange={(e) => setHeightLocked(e.target.value)}
                      style={inputStyle}
                    />
                  </div>
                </div>
                <button
                  type="button"
                  className="forge-btn"
                  onClick={toggleAspectLock}
                  style={{ alignSelf: 'flex-start' }}
                >
                  {aspectLock ? <Lock size={14} /> : <Unlock size={14} />}
                  {aspectLock ? 'Aspect ratio locked' : 'Aspect ratio free'}
                </button>
                <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-ui)' }}>
                  Original {natural.w} × {natural.h}px
                </p>
              </div>
            )}

            {tab === 'compress' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {outputFormat === 'png' && (
                  <p style={{ margin: 0, fontSize: 11, color: '#F97316', fontFamily: 'var(--font-ui)', padding: '6px 10px', background: 'rgba(249,115,22,0.08)', borderRadius: 6, border: '1px solid rgba(249,115,22,0.2)' }}>
                    PNG is lossless — compression controls apply to JPEG and WebP only.
                  </p>
                )}
                {outputFormat !== 'png' && (
                  <>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        type="button"
                        className={`forge-btn ${compressMode === 'percentage' ? 'forge-btn-primary' : ''}`}
                        onClick={() => setCompressMode('percentage')}
                        style={{ fontSize: 11, padding: '5px 10px', gap: 4 }}
                      >
                        <Percent size={12} /> By Percentage
                      </button>
                      <button
                        type="button"
                        className={`forge-btn ${compressMode === 'target' ? 'forge-btn-primary' : ''}`}
                        onClick={() => setCompressMode('target')}
                        style={{ fontSize: 11, padding: '5px 10px', gap: 4 }}
                      >
                        <Target size={12} /> By Target Size
                      </button>
                    </div>

                    {compressMode === 'percentage' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <label style={labelStyle}>
                          Compression ({100 - quality}%)
                        </label>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={100 - quality}
                          onChange={(e) => setQuality(100 - Number(e.target.value))}
                          style={{ width: '100%', accentColor: 'var(--accent)' }}
                        />
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-ui)' }}>
                          <span>Less compression</span>
                          <span>More compression</span>
                        </div>
                      </div>
                    )}

                    {compressMode === 'target' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <label style={labelStyle}>Target file size</label>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <input
                            type="number"
                            min={1}
                            value={targetSizeValue}
                            onChange={(e) => { setTargetSizeValue(e.target.value); setTargetSizeStatus(null) }}
                            placeholder="e.g. 250"
                            style={{ ...inputStyle, flex: 1 }}
                          />
                          <select
                            value={targetSizeUnit}
                            onChange={(e) => { setTargetSizeUnit(e.target.value); setTargetSizeStatus(null) }}
                            style={{ ...inputStyle, flex: 'none', width: 70, cursor: 'pointer' }}
                          >
                            <option value="KB">KB</option>
                            <option value="MB">MB</option>
                          </select>
                          <button
                            type="button"
                            className="forge-btn forge-btn-primary"
                            onClick={compressToTargetSize}
                            disabled={targetSizeProcessing || !targetSizeValue}
                            style={{ fontSize: 11, padding: '7px 14px', whiteSpace: 'nowrap' }}
                          >
                            {targetSizeProcessing ? 'Compressing...' : 'Compress'}
                          </button>
                        </div>
                        {targetSizeStatus && (
                          <p style={{ margin: 0, fontSize: 12, color: 'var(--accent)', fontFamily: 'var(--font-code)' }}>
                            {targetSizeStatus}
                          </p>
                        )}
                        <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-ui)' }}>
                          Automatically finds the best compression level to reach your target size.
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {tab === 'format' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <span style={labelStyle}>Output format</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {['png', 'jpeg', 'webp'].map((fmt) => (
                    <button
                      key={fmt}
                      type="button"
                      className={`forge-btn ${outputFormat === fmt ? 'forge-btn-primary' : ''}`}
                      onClick={() => setOutputFormat(fmt)}
                      style={outputFormat === fmt ? {} : { textTransform: 'uppercase' }}
                    >
                      {fmt === 'jpeg' ? 'JPEG' : fmt.toUpperCase()}
                    </button>
                  ))}
                </div>
                <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-ui)' }}>
                  WebP balances size and quality; JPEG for photos; PNG for transparency.
                </p>
              </div>
            )}
          </div>

          <div className="forge-card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', fontFamily: 'var(--font-ui)' }}>
              Preview
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
              <div>
                <div style={{ ...labelStyle, marginBottom: 8 }}>Original</div>
                <div style={previewBox}>
                  {objectUrl && (
                    <img
                      src={objectUrl}
                      alt=""
                      style={{ maxWidth: '100%', maxHeight: 260, objectFit: 'contain', borderRadius: 4 }}
                    />
                  )}
                  <span style={{ fontSize: 12, fontFamily: 'var(--font-code)', color: 'var(--text-muted)' }}>
                    {formatBytes(originalSize)}
                  </span>
                </div>
              </div>
              <div>
                <div style={{ ...labelStyle, marginBottom: 8 }}>Processed</div>
                <div style={previewBox}>
                  {processing && (
                    <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-ui)' }}>Processing…</span>
                  )}
                  {!processing && processedUrl && (
                    <>
                      <img
                        src={processedUrl}
                        alt=""
                        style={{ maxWidth: '100%', maxHeight: 260, objectFit: 'contain', borderRadius: 4 }}
                      />
                      <span style={{ fontSize: 12, fontFamily: 'var(--font-code)', color: 'var(--text-muted)' }}>
                        {formatBytes(processedSize)}
                        {savings != null && (
                          <span style={{ color: savings >= 0 ? 'var(--accent)' : 'var(--text-muted)', marginLeft: 8 }}>
                            ({savings >= 0 ? '−' : '+'}{Math.abs(savings)}% vs original)
                          </span>
                        )}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 900px) {
          .image-tool-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}
