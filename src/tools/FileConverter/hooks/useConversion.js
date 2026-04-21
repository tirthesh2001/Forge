import { useState, useCallback, useMemo, useRef } from 'react'
import toast from 'react-hot-toast'
import { detectFormat, WARN_BYTES, MAX_BYTES, FORMAT_LABELS } from '../constants'
import { getAllTargets, runConversion, modeSupports, hasServerConfig } from '../services'

export default function useConversion() {
  const [file, setFile] = useState(null)
  const [srcFormat, setSrcFormat] = useState(null)
  const [targetFormat, setTargetFormat] = useState(null)
  const [mode, setMode] = useState('client')
  const [quality, setQuality] = useState(0.92)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [converting, setConverting] = useState(false)
  const [progress, setProgress] = useState({ phase: 'idle', pct: 0 })
  const abortRef = useRef({ cancelled: false })

  const targets = useMemo(() => getAllTargets(srcFormat), [srcFormat])

  const reset = useCallback(() => {
    abortRef.current.cancelled = true
    abortRef.current = { cancelled: false }
    setFile(null)
    setSrcFormat(null)
    setTargetFormat(null)
    setResult(null)
    setError(null)
    setConverting(false)
    setProgress({ phase: 'idle', pct: 0 })
  }, [])

  const loadFile = useCallback((f) => {
    setResult(null)
    setError(null)
    if (!f) { setFile(null); setSrcFormat(null); return }
    if (f.size > MAX_BYTES) {
      setError({ type: 'size', message: `File too large (${(f.size / 1024 / 1024).toFixed(1)} MB). Max supported size is ${MAX_BYTES / 1024 / 1024} MB.` })
      toast.error('File too large')
      return
    }
    if (f.size > WARN_BYTES) {
      toast(`Large file (${(f.size / 1024 / 1024).toFixed(1)} MB). Conversion may take a while.`, { icon: '⚠️' })
    }
    const fmt = detectFormat(f)
    setFile(f)
    setSrcFormat(fmt)
    setTargetFormat(null)
    if (!fmt) {
      setError({ type: 'unsupported', message: 'Unknown file format. Try renaming the file with a proper extension.' })
    }
  }, [])

  const doConvert = useCallback(async () => {
    if (!file || !srcFormat || !targetFormat) return
    const supports = modeSupports(srcFormat, targetFormat, mode)
    if (!supports) {
      const other = mode === 'client' ? 'server' : 'client'
      if (modeSupports(srcFormat, targetFormat, other)) {
        toast(`Switching to ${other === 'server' ? 'Server' : 'Client'} conversion (only mode that supports this pair).`)
        setMode(other)
        return
      }
      setError({ type: 'mode', message: `This conversion isn't available in ${mode === 'client' ? 'client' : 'server'} mode.` })
      return
    }
    if (mode === 'server' && !hasServerConfig()) {
      setError({ type: 'config', message: 'Server conversion requires a CloudConvert API key. Add one in Settings.' })
      toast.error('Server conversion needs an API key')
      return
    }
    setConverting(true)
    setError(null)
    setResult(null)
    setProgress({ phase: 'starting', pct: 5 })
    try {
      const out = await runConversion({
        file, srcFormat, targetFormat, mode,
        opts: { quality, pretty: true },
        onProgress: (p) => setProgress(p),
      })
      setResult(out)
      toast.success(`Converted to ${FORMAT_LABELS[targetFormat] || targetFormat.toUpperCase()}`)
    } catch (err) {
      console.error('Conversion error:', err)
      setError({ type: 'convert', message: err.message || 'Conversion failed' })
      toast.error(err.message || 'Conversion failed')
    } finally {
      setConverting(false)
    }
  }, [file, srcFormat, targetFormat, mode, quality])

  return {
    file, srcFormat, targetFormat, mode, quality, result, error, converting, progress, targets,
    setTargetFormat, setMode, setQuality,
    loadFile, doConvert, reset,
  }
}
