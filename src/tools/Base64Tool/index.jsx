import { useState, useCallback, useRef } from 'react'
import { Copy, Download, Upload, FileCode2 } from 'lucide-react'
import toast from 'react-hot-toast'
import useCloudState from '../../hooks/useCloudState'
import ToolHeader from '../../components/ToolHeader'
import { copyWithHistory } from '../../utils/copyWithHistory'
import DropZone from '../../components/DropZone'
import { BASE64_LARGE_FILE_BYTES } from '../../constants/storageLimits'
import formatBytes from '../../utils/formatBytes'

function uint8ToBase64(u8) {
  let binary = ''
  const CHUNK = 0x8000
  for (let i = 0; i < u8.length; i += CHUNK) {
    binary += String.fromCharCode.apply(null, u8.subarray(i, i + CHUNK))
  }
  return btoa(binary)
}

export default function Base64Tool() {
  const [mode, setMode] = useCloudState('base64-mode', 'encode')
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [fileName, setFileName] = useState('')
  const [largeEncodeReady, setLargeEncodeReady] = useState(false)
  const [fullOutputCharCount, setFullOutputCharCount] = useState(0)
  const fileRef = useRef(null)
  const fullBase64Ref = useRef(null)

  const encode = useCallback((text) => {
    setLargeEncodeReady(false)
    setFullOutputCharCount(0)
    fullBase64Ref.current = null
    setInput(text)
    try { setOutput(btoa(unescape(encodeURIComponent(text)))) } catch { setOutput('Error: invalid input') }
  }, [])

  const decode = useCallback((text) => {
    setLargeEncodeReady(false)
    setFullOutputCharCount(0)
    fullBase64Ref.current = null
    setInput(text)
    try { setOutput(decodeURIComponent(escape(atob(text.trim())))) } catch { setOutput('Error: invalid Base64') }
  }, [])

  const handleInput = useCallback((text) => {
    if (mode === 'encode') encode(text)
    else decode(text)
  }, [mode, encode, decode])

  const encodeLargeBinary = useCallback(async (file) => {
    const buf = await file.arrayBuffer()
    const u8 = new Uint8Array(buf)
    const b64 = uint8ToBase64(u8)
    fullBase64Ref.current = b64
    setFullOutputCharCount(b64.length)
    setLargeEncodeReady(true)
    setInput(`[File: ${file.name} — ${formatBytes(file.size)}]`)
    const head = b64.slice(0, 12_000)
    setOutput(
      `${head}${b64.length > 12_000 ? '\n\n… Preview truncated. Use “Download Base64” to save the full encoded file.' : ''}`,
    )
    toast.success('Large file encoded — download for the complete Base64')
  }, [])

  const handleFile = useCallback((e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    const reader = new FileReader()
    if (mode === 'encode') {
      if (file.size > BASE64_LARGE_FILE_BYTES) {
        encodeLargeBinary(file)
        e.target.value = ''
        return
      }
      reader.onload = () => {
        const base64 = reader.result.split(',')[1] || ''
        setLargeEncodeReady(false)
        setFullOutputCharCount(0)
        fullBase64Ref.current = null
        setInput(`[File: ${file.name}]`)
        setOutput(base64)
      }
      reader.readAsDataURL(file)
    } else {
      if (file.size > BASE64_LARGE_FILE_BYTES) {
        toast('Very large file — decode may be slow or fail in the browser.', { icon: '⚠️' })
      }
      reader.onload = () => { decode(reader.result) }
      reader.readAsText(file)
    }
    e.target.value = ''
  }, [mode, decode, encodeLargeBinary])

  const downloadEncodedBase64 = useCallback(() => {
    const b64 = fullBase64Ref.current
    if (!b64) return
    const blob = new Blob([b64], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${(fileName || 'encoded').replace(/\.[^.]+$/, '') || 'encoded'}.b64.txt`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Downloaded')
  }, [fileName])

  const downloadDecoded = useCallback(() => {
    try {
      const bytes = atob(input.trim())
      const arr = new Uint8Array(bytes.length)
      for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i)
      const blob = new Blob([arr])
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = fileName || 'decoded'; a.click()
      URL.revokeObjectURL(url)
      toast.success('Downloaded')
    } catch { toast.error('Could not decode file') }
  }, [input, fileName])

  const switchMode = useCallback((newMode) => {
    if (newMode === mode) return
    const carry = String(output || '').trim()
    setLargeEncodeReady(false)
    setFullOutputCharCount(0)
    fullBase64Ref.current = null
    setMode(newMode)
    if (carry) {
      if (newMode === 'decode') decode(carry)
      else encode(carry)
    } else {
      setInput('')
      setOutput('')
    }
  }, [mode, output, encode, decode, setMode])

  const swap = useCallback(() => {
    const newMode = mode === 'encode' ? 'decode' : 'encode'
    switchMode(newMode)
  }, [mode, switchMode])

  const onDropFile = useCallback((file) => {
    setFileName(file.name)
    if (mode === 'encode' && file.size > BASE64_LARGE_FILE_BYTES) {
      encodeLargeBinary(file)
      return
    }
    file.text().then((text) => handleInput(text))
  }, [mode, encodeLargeBinary, handleInput])

  const inputStyle = {
    width: '100%', minHeight: 200, background: 'var(--bg)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius)', padding: '14px 16px', color: 'var(--text)',
    fontFamily: 'var(--font-code)', fontSize: 13, resize: 'vertical', outline: 'none',
  }

  return (
    <div>
      <ToolHeader toolId="base64" title="Base64" description="Encode and decode Base64 text and files">
        <div className="tab-pills">
          <button type="button" className={`tab-pill ${mode === 'encode' ? 'active' : ''}`} onClick={() => switchMode('encode')}>Encode</button>
          <button type="button" className={`tab-pill ${mode === 'decode' ? 'active' : ''}`} onClick={() => switchMode('decode')}>Decode</button>
        </div>
      </ToolHeader>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="forge-card" style={{ padding: 0 }}>
          <DropZone
            compact
            accept="*"
            onFile={onDropFile}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Input</span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button type="button" onClick={() => fileRef.current?.click()} className="forge-btn" style={{ padding: '3px 8px', fontSize: 11 }}><Upload size={11} /> File</button>
                <input ref={fileRef} type="file" onChange={handleFile} className="hidden" />
              </div>
            </div>
            <textarea value={input} onChange={(e) => handleInput(e.target.value)} style={{ ...inputStyle, border: 'none', borderRadius: 0 }}
              placeholder={mode === 'encode' ? 'Enter text to encode...' : 'Paste Base64 to decode...'} />
          </DropZone>
        </div>

        <div className="forge-card" style={{ padding: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Output</span>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <button type="button" onClick={() => copyWithHistory(largeEncodeReady ? (fullBase64Ref.current || output) : output)} className="forge-btn" style={{ padding: '3px 8px', fontSize: 11 }}><Copy size={11} /> Copy</button>
              {mode === 'encode' && largeEncodeReady && (
                <button type="button" onClick={downloadEncodedBase64} className="forge-btn" style={{ padding: '3px 8px', fontSize: 11 }}><Download size={11} /> Base64 file</button>
              )}
              {mode === 'decode' && (
                <button type="button" onClick={downloadDecoded} className="forge-btn" style={{ padding: '3px 8px', fontSize: 11 }}><Download size={11} /> File</button>
              )}
              <button type="button" onClick={swap} className="forge-btn" style={{ padding: '3px 8px', fontSize: 11 }}><FileCode2 size={11} /> Swap</button>
            </div>
          </div>
          <textarea readOnly value={output} style={{ ...inputStyle, border: 'none', borderRadius: 0 }}
            placeholder="Output will appear here..." />
        </div>
      </div>

      {output && (
        <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-code)' }}>
          Input: {input.length} chars &middot; Output: {(largeEncodeReady ? fullOutputCharCount : output.length)} chars
          {mode === 'encode' && <span> &middot; ~{Math.ceil((largeEncodeReady ? fullOutputCharCount : output.length) / 1024)} KB</span>}
        </div>
      )}
    </div>
  )
}
