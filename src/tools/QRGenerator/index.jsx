import { useState, useRef, useCallback, useEffect } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { BrowserMultiFormatReader } from '@zxing/library'
import {
  Download, Copy, Image, Upload, Camera, CameraOff,
  AlertCircle, QrCode, ScanLine, Bookmark, Trash2, Play,
} from 'lucide-react'

import toast from 'react-hot-toast'
import { motion } from 'framer-motion'
import useCloudState from '../../hooks/useCloudState'
import ToolHeader from '../../components/ToolHeader'

const EC_LEVELS = ['L', 'M', 'Q', 'H']
const FORMATS = ['QR Code', 'Code128', 'Code39', 'EAN-13', 'EAN-8', 'UPC-A']

export default function QRTools() {
  const [mode, setMode] = useCloudState('qr-mode', 'generate')
  const [saved, setSaved] = useCloudState('qr-saved', [])

  const [fillTrigger, setFillTrigger] = useState(null)

  const quickFill = useCallback((item) => {
    setFillTrigger(item)
    setMode('generate')
  }, [])

  const saveItem = useCallback((text, settings = {}) => {
    if (!text.trim()) return
    const item = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      text: text.trim(),
      label: settings.label || text.trim().slice(0, 60),
      fgColor: settings.fgColor || '#FFFFFF',
      bgColor: settings.bgColor || '#0A0A0F',
      ecLevel: settings.ecLevel || 'M',
      size: settings.size || 256,
      createdAt: new Date().toISOString(),
    }
    setSaved((prev) => [item, ...prev])
    toast.success('Saved')
  }, [])

  const deleteItem = useCallback((id) => {
    setSaved((prev) => prev.filter((i) => i.id !== id))
    toast.success('Removed')
  }, [])

  return (
    <div>
      <ToolHeader toolId="qr" title="QR Tools" description="Create QR codes from text, URLs or data">
        <div className="tab-pills">
          <button className={`tab-pill ${mode === 'generate' ? 'active' : ''}`} onClick={() => setMode('generate')}>
            <QrCode size={15} /> Generate
          </button>
          <button className={`tab-pill ${mode === 'read' ? 'active' : ''}`} onClick={() => setMode('read')}>
            <ScanLine size={15} /> Read
          </button>
        </div>
      </ToolHeader>

      {mode === 'generate' && <GeneratePanel onSave={saveItem} fillTrigger={fillTrigger} onFillConsumed={() => setFillTrigger(null)} />}
      {mode === 'read' && <ReadPanel onSave={saveItem} />}

      {saved.length > 0 && (
        <SavedList items={saved} onDelete={deleteItem} onQuickFill={quickFill} />
      )}
    </div>
  )
}

function GeneratePanel({ onSave, fillTrigger, onFillConsumed }) {
  const [text, setText] = useCloudState('qr-text', '')
  const [size, setSize] = useCloudState('qr-size', 256)
  const [ecLevel, setEcLevel] = useCloudState('qr-ec', 'M')
  const [fgColor, setFgColor] = useCloudState('qr-fg', '#FFFFFF')
  const [bgColor, setBgColor] = useCloudState('qr-bg', '#0A0A0F')
  const qrRef = useRef(null)

  useEffect(() => {
    if (fillTrigger) {
      setText(fillTrigger.text)
      setSize(fillTrigger.size || 256)
      setEcLevel(fillTrigger.ecLevel || 'M')
      setFgColor(fillTrigger.fgColor || '#FFFFFF')
      setBgColor(fillTrigger.bgColor || '#0A0A0F')
      onFillConsumed()
      toast.success('Loaded from saved')
    }
  }, [fillTrigger])

  const getSvg = () => qrRef.current?.querySelector('svg')

  const downloadPNG = useCallback(() => {
    const svg = getSvg()
    if (!svg) return
    const svgData = new XMLSerializer().serializeToString(svg)
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')
    const img = new window.Image()
    img.onload = () => {
      ctx.drawImage(img, 0, 0)
      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'qrcode.png'
        a.click()
        URL.revokeObjectURL(url)
        toast.success('PNG downloaded')
      })
    }
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)))
  }, [size])

  const downloadSVG = useCallback(() => {
    const svg = getSvg()
    if (!svg) return
    const svgData = new XMLSerializer().serializeToString(svg)
    const blob = new Blob([svgData], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'qrcode.svg'
    a.click()
    URL.revokeObjectURL(url)
    toast.success('SVG downloaded')
  }, [])

  const copyToClipboard = useCallback(async () => {
    const svg = getSvg()
    if (!svg) return
    try {
      const svgData = new XMLSerializer().serializeToString(svg)
      const canvas = document.createElement('canvas')
      canvas.width = size
      canvas.height = size
      const ctx = canvas.getContext('2d')
      const img = new window.Image()
      img.onload = async () => {
        ctx.drawImage(img, 0, 0)
        canvas.toBlob(async (blob) => {
          try {
            await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
            toast.success('Copied to clipboard')
          } catch { toast.error('Failed to copy') }
        })
      }
      img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)))
    } catch { toast.error('Failed to copy') }
  }, [size])

  return (
    <div className="forge-card" style={{ padding: 0 }}>
      <div className="flex" style={{ minHeight: 320 }}>
        <div className="flex-1 flex flex-col" style={{ padding: 24, borderRight: '1px solid var(--border)' }}>
          <div className="relative flex-1">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Enter text, URL, or data..."
              className="w-full h-full resize-none outline-none"
              style={{
                background: 'var(--bg)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius)', padding: '14px 16px',
                color: 'var(--text)', fontFamily: 'var(--font-code)', fontSize: 14, minHeight: 160,
              }}
            />
            <span className="absolute bottom-3 right-4 text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-code)' }}>
              {text.length} chars
            </span>
          </div>
        </div>
        <div ref={qrRef} className="flex items-center justify-center shrink-0"
          style={{ width: Math.max(size + 64, 300), padding: 24, background: 'var(--bg)' }}>
          {text ? (
            <QRCodeSVG value={text} size={size} level={ecLevel} fgColor={fgColor} bgColor={bgColor} />
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 text-center"
              style={{ width: size, height: size, color: 'var(--text-muted)', border: '2px dashed var(--border)', borderRadius: 'var(--radius)' }}>
              <QrCode size={32} style={{ opacity: 0.3 }} />
              <span className="text-xs">Preview</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-6 flex-wrap"
        style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', background: 'var(--surface)' }}>
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium" style={{ color: 'var(--text-muted)', width: 60 }}>Size: {size}px</span>
          <input type="range" min={128} max={512} value={size}
            onChange={(e) => setSize(Number(e.target.value))} style={{ accentColor: 'var(--accent)', width: 120 }} />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>EC:</span>
          <div className="flex gap-1">
            {EC_LEVELS.map((level) => (
              <button key={level} onClick={() => setEcLevel(level)} className="text-xs font-medium cursor-pointer"
                style={{
                  padding: '4px 10px', borderRadius: 6,
                  border: ecLevel === level ? '1px solid var(--accent)' : '1px solid var(--border)',
                  background: ecLevel === level ? 'color-mix(in srgb, var(--accent) 12%, transparent)' : 'transparent',
                  color: ecLevel === level ? 'var(--accent)' : 'var(--text-muted)', transition: 'all 0.15s',
                }}>
                {level}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>FG</span>
            <input type="color" value={fgColor} onChange={(e) => setFgColor(e.target.value)} className="w-6 h-6 cursor-pointer rounded border-0" style={{ background: 'none' }} />
            <input type="text" value={fgColor} onChange={(e) => setFgColor(e.target.value)}
              className="outline-none text-xs" style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, padding: '3px 8px', color: 'var(--text)', fontFamily: 'var(--font-code)', width: 80 }} />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>BG</span>
            <input type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)} className="w-6 h-6 cursor-pointer rounded border-0" style={{ background: 'none' }} />
            <input type="text" value={bgColor} onChange={(e) => setBgColor(e.target.value)}
              className="outline-none text-xs" style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, padding: '3px 8px', color: 'var(--text)', fontFamily: 'var(--font-code)', width: 80 }} />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap" style={{ padding: '14px 24px', borderTop: '1px solid var(--border)' }}>
        <button onClick={downloadPNG} disabled={!text} className="forge-btn forge-btn-primary">
          <Download size={14} /> Download PNG
        </button>
        <button onClick={downloadSVG} disabled={!text} className="forge-btn">
          <Image size={14} /> Download SVG
        </button>
        <button onClick={copyToClipboard} disabled={!text} className="forge-btn">
          <Copy size={14} /> Copy Image
        </button>
        <div style={{ flex: 1 }} />
        <button
          onClick={() => onSave(text, { fgColor, bgColor, ecLevel, size })}
          disabled={!text}
          className="forge-btn"
        >
          <Bookmark size={14} /> Save
        </button>
      </div>
    </div>
  )
}

function ReadPanel({ onSave }) {
  const [subTab, setSubTab] = useState('upload')
  const [result, setResult] = useState('')
  const [error, setError] = useState('')
  const [flash, setFlash] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef(null)
  const videoRef = useRef(null)
  const readerRef = useRef(null)

  useEffect(() => {
    readerRef.current = new BrowserMultiFormatReader()
    return () => { readerRef.current?.reset() }
  }, [])

  const showSuccess = useCallback((text) => {
    setResult(text)
    setError('')
    setFlash(true)
    setTimeout(() => setFlash(false), 600)
    toast.success('Code decoded')
  }, [])

  const decodeImage = useCallback(async (file) => {
    if (!file) return
    setError('')
    setResult('')
    try {
      const url = URL.createObjectURL(file)
      const img = document.createElement('img')
      img.src = url
      await new Promise((r) => { img.onload = r })
      const res = await readerRef.current.decodeFromImageElement(img)
      URL.revokeObjectURL(url)
      showSuccess(res.getText())
    } catch {
      setError('No barcode or QR code detected')
      setResult('')
    }
  }, [showSuccess])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith('image/')) decodeImage(file)
    else toast.error('Invalid file type')
  }, [decodeImage])

  const stopCamera = useCallback(() => {
    readerRef.current?.reset()
    readerRef.current = new BrowserMultiFormatReader()
    setScanning(false)
  }, [])

  const startCamera = useCallback(async () => {
    setScanning(true)
    setError('')
    setResult('')
    try {
      await readerRef.current.decodeFromVideoDevice(undefined, videoRef.current, (res) => {
        if (res) { showSuccess(res.getText()); stopCamera() }
      })
    } catch {
      setError('Could not access camera')
      setScanning(false)
    }
  }, [showSuccess, stopCamera])

  return (
    <div className="forge-card">
      <div className="flex items-center justify-between mb-5">
        <div className="tab-pills">
          <button className={`tab-pill ${subTab === 'upload' ? 'active' : ''}`} onClick={() => { if (scanning) stopCamera(); setSubTab('upload') }}>
            <Upload size={14} /> Upload
          </button>
          <button className={`tab-pill ${subTab === 'camera' ? 'active' : ''}`} onClick={() => setSubTab('camera')}>
            <Camera size={14} /> Camera
          </button>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {FORMATS.map((f) => (
            <span key={f} className="text-xs px-2 py-0.5" style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-muted)' }}>{f}</span>
          ))}
        </div>
      </div>

      {subTab === 'upload' && (
        <div onDragOver={(e) => { e.preventDefault(); setDragOver(true) }} onDragLeave={() => setDragOver(false)} onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className="flex flex-col items-center justify-center gap-3 cursor-pointer transition-all duration-200"
          style={{
            background: dragOver ? 'color-mix(in srgb, var(--accent) 4%, var(--bg))' : 'var(--bg)',
            border: `2px dashed ${dragOver ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 'var(--radius)', padding: '56px 24px',
          }}>
          <Upload size={28} style={{ color: 'var(--text-muted)', opacity: 0.5 }} />
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Drop an image here or click to upload</p>
          <p className="text-xs" style={{ color: 'var(--text-muted)', opacity: 0.5 }}>PNG, JPG, GIF, WebP</p>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={(e) => decodeImage(e.target.files[0])} className="hidden" />
        </div>
      )}

      {subTab === 'camera' && (
        <div className="flex flex-col items-center gap-4">
          <div className="overflow-hidden relative"
            style={{ borderRadius: 12, border: '1px solid var(--border)', width: '100%', maxWidth: 480, aspectRatio: '4/3', background: 'var(--bg)' }}>
            <video ref={videoRef} className="w-full h-full object-cover" style={{ display: scanning ? 'block' : 'none' }} />
            {!scanning && (
              <div className="absolute inset-0 flex items-center justify-center" style={{ color: 'var(--text-muted)' }}>
                <CameraOff size={36} style={{ opacity: 0.4 }} />
              </div>
            )}
          </div>
          <button onClick={scanning ? stopCamera : startCamera} className={`forge-btn ${scanning ? '' : 'forge-btn-primary'}`}
            style={scanning ? { background: '#EF4444', color: '#fff', borderColor: '#EF4444' } : {}}>
            {scanning ? <><CameraOff size={14} /> Stop</> : <><Camera size={14} /> Start Scanning</>}
          </button>
        </div>
      )}

      {(result || error) && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-5">
          {error ? (
            <div className="flex items-center gap-2 text-sm" style={{ padding: '12px 16px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 'var(--radius)', color: '#EF4444' }}>
              <AlertCircle size={16} /> {error}
            </div>
          ) : (
            <div>
              <div className="relative" style={{ borderLeft: flash ? '3px solid #22C55E' : '3px solid var(--accent)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
                <textarea readOnly value={result} rows={3} className="w-full resize-none outline-none"
                  style={{
                    background: 'var(--bg)', border: '1px solid var(--border)', borderLeft: 'none',
                    borderRadius: '0 var(--radius) var(--radius) 0', padding: '14px 48px 14px 16px',
                    color: 'var(--text)', fontFamily: 'var(--font-code)', fontSize: 13,
                  }} />
                <button onClick={() => { navigator.clipboard.writeText(result); toast.success('Copied') }}
                  className="absolute top-3 right-3 cursor-pointer" style={{ background: 'none', border: 'none', color: 'var(--text-muted)' }}>
                  <Copy size={16} />
                </button>
              </div>
              <div className="flex justify-end mt-2">
                <button onClick={() => onSave(result, { label: `Scanned: ${result.slice(0, 40)}` })} className="forge-btn">
                  <Bookmark size={13} /> Save Result
                </button>
              </div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  )
}

function SavedList({ items, onDelete, onQuickFill }) {
  return (
    <div className="forge-card" style={{ marginTop: 16, padding: 0, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '1px solid var(--border)' }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Saved QR Codes
        </span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', opacity: 0.6 }}>{items.length} item{items.length !== 1 ? 's' : ''}</span>
      </div>
      <div>
        {items.map((item, i) => (
          <div key={item.id} style={{
            display: 'flex', alignItems: 'center', gap: 14, padding: '12px 20px',
            borderBottom: i < items.length - 1 ? '1px solid var(--border)' : 'none',
            background: i % 2 === 0 ? 'transparent' : 'var(--surface-hover)',
          }}>
            <div style={{ flexShrink: 0, background: 'var(--bg)', borderRadius: 'var(--radius)', padding: 6, border: '1px solid var(--border)' }}>
              <QRCodeSVG value={item.text} size={44} level={item.ecLevel || 'M'} fgColor={item.fgColor || '#FFFFFF'} bgColor={item.bgColor || '#0A0A0F'} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {item.label}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-code)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>
                {item.text}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
              <button onClick={() => onQuickFill(item)} className="forge-btn" style={{ padding: '5px 10px', fontSize: 11 }} title="Load into generator">
                <Play size={11} /> Fill
              </button>
              <button onClick={() => { navigator.clipboard.writeText(item.text); toast.success('Copied') }} className="forge-btn" style={{ padding: '5px 8px' }} title="Copy text">
                <Copy size={11} />
              </button>
              <button onClick={() => onDelete(item.id)} className="forge-btn" style={{ padding: '5px 8px', color: '#EF4444' }} title="Delete">
                <Trash2 size={11} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
