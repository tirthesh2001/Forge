import { useState, useRef, useCallback } from 'react'
import { Upload } from 'lucide-react'

export default function DropZone({ onFile, accept, label, compact, children, style: outerStyle }) {
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef(null)
  const counter = useRef(0)

  const handleDragEnter = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    counter.current++
    setDragging(true)
  }, [])

  const handleDragLeave = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    counter.current--
    if (counter.current === 0) setDragging(false)
  }, [])

  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    counter.current = 0
    setDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) onFile?.(file)
  }, [onFile])

  const handleClick = useCallback(() => {
    inputRef.current?.click()
  }, [])

  const handleInput = useCallback((e) => {
    const file = e.target.files?.[0]
    if (file) onFile?.(file)
    e.target.value = ''
  }, [onFile])

  if (compact) {
    return (
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        style={{ position: 'relative', ...outerStyle }}
      >
        {dragging && (
          <div style={{
            position: 'absolute', inset: 0, zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'color-mix(in srgb, var(--accent) 10%, var(--bg))', border: '2px dashed var(--accent)',
            borderRadius: 'var(--radius)', backdropFilter: 'blur(4px)',
          }}>
            <span style={{ color: 'var(--accent)', fontSize: 13, fontWeight: 500 }}>Drop file here</span>
          </div>
        )}
        {children}
        <input ref={inputRef} type="file" accept={accept} onChange={handleInput} className="hidden" />
      </div>
    )
  }

  return (
    <div
      onClick={handleClick}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      style={{
        border: `2px dashed ${dragging ? 'var(--accent)' : 'var(--border)'}`,
        borderRadius: 'var(--radius)',
        padding: '32px 24px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10,
        cursor: 'pointer',
        background: dragging ? 'color-mix(in srgb, var(--accent) 6%, var(--bg))' : 'var(--bg)',
        transition: 'border-color 0.2s, background 0.2s',
        ...outerStyle,
      }}
    >
      <Upload size={24} style={{ color: dragging ? 'var(--accent)' : 'var(--text-muted)', transition: 'color 0.2s' }} />
      <span style={{ fontSize: 13, color: dragging ? 'var(--accent)' : 'var(--text-muted)', textAlign: 'center' }}>
        {label || 'Drop file here or click to browse'}
      </span>
      <input ref={inputRef} type="file" accept={accept} onChange={handleInput} className="hidden" />
    </div>
  )
}
