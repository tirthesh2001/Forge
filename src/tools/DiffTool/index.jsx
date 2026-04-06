import { useState, useCallback, useRef, useMemo, useEffect } from 'react'
import { diffLines, diffWords } from 'diff'
import { diff as deepDiff, applyChange } from 'deep-diff'
import { ArrowLeftRight, Upload, Plus, Minus, Edit2, Check, X, Copy, RotateCcw, CheckCheck } from 'lucide-react'
import toast from 'react-hot-toast'
import useCloudState from '../../hooks/useCloudState'
import ToolHeader from '../../components/ToolHeader'
import DropZone from '../../components/DropZone'

function flattenPath(path) {
  return path ? path.join('.') : '(root)'
}

function describeChange(change) {
  const p = flattenPath(change.path)
  switch (change.kind) {
    case 'N': return { icon: Plus, color: '#22C55E', bg: 'rgba(34,197,94,0.08)', border: '#22C55E', text: `Added '${p}' with value ${JSON.stringify(change.rhs)}` }
    case 'D': return { icon: Minus, color: '#EF4444', bg: 'rgba(239,68,68,0.08)', border: '#EF4444', text: `Removed '${p}' (was ${JSON.stringify(change.lhs)})` }
    case 'E': return { icon: Edit2, color: '#EAB308', bg: 'rgba(234,179,8,0.08)', border: '#EAB308', text: `Changed '${p}' from ${JSON.stringify(change.lhs)} to ${JSON.stringify(change.rhs)}` }
    case 'A': return { icon: Edit2, color: '#EAB308', bg: 'rgba(234,179,8,0.08)', border: '#EAB308', text: `Array '${p}' modified at index ${change.index}` }
    default: return { icon: Edit2, color: 'var(--text-muted)', bg: 'transparent', border: 'var(--border)', text: `Unknown change at '${p}'` }
  }
}

function WordDiff({ oldText, newText, type }) {
  if (type === 'unchanged') return <span style={{ color: 'var(--text)' }}>{oldText}</span>

  const words = diffWords(oldText || '', newText || '')
  return (
    <>
      {words.map((part, i) => {
        if (part.added) {
          return <span key={i} style={{ background: 'rgba(34,197,94,0.25)', color: '#22C55E', borderRadius: 2, padding: '0 1px' }}>{part.value}</span>
        }
        if (part.removed) {
          return <span key={i} style={{ background: 'rgba(239,68,68,0.25)', color: '#EF4444', borderRadius: 2, padding: '0 1px', textDecoration: 'line-through' }}>{part.value}</span>
        }
        return <span key={i} style={{ color: type === 'added' ? '#22C55E' : type === 'removed' ? '#EF4444' : 'var(--text)' }}>{part.value}</span>
      })}
    </>
  )
}

const DIFF_ACCEPT = '.txt,.json,.md,.csv,.xml,.html,.js,.ts,.jsx,.tsx,.py,.java,.go,.rs,.rb,.css,.scss'

export default function DiffTool() {
  const [mode, setMode] = useCloudState('diff-mode', 'text')
  const [left, setLeft] = useCloudState('diff-left', '')
  const [right, setRight] = useCloudState('diff-right', '')
  const leftFileRef = useRef(null)
  const rightFileRef = useRef(null)

  const swap = useCallback(() => {
    setLeft((l) => { setRight(l); return right })
  }, [right])

  const loadFile = useCallback((side) => (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      toast('Large file detected. Processing may take a moment.', { icon: '⚠️' })
    }
    const reader = new FileReader()
    reader.onload = (ev) => {
      if (side === 'left') setLeft(ev.target.result)
      else setRight(ev.target.result)
    }
    reader.readAsText(file)
  }, [])

  const onDropLeftFile = useCallback((file) => {
    if (file.size > 5 * 1024 * 1024) {
      toast('Large file detected. Processing may take a moment.', { icon: '⚠️' })
    }
    file.text().then((text) => setLeft(text))
  }, [setLeft])

  const onDropRightFile = useCallback((file) => {
    if (file.size > 5 * 1024 * 1024) {
      toast('Large file detected. Processing may take a moment.', { icon: '⚠️' })
    }
    file.text().then((text) => setRight(text))
  }, [setRight])

  const textDiffResult = useMemo(() => {
    if (!left && !right) return null
    return diffLines(left, right)
  }, [left, right])

  const jsonDiffResult = useMemo(() => {
    if (!left && !right) return null
    try {
      const a = JSON.parse(left)
      const b = JSON.parse(right)
      return { changes: deepDiff(a, b) || [], error: null }
    } catch (e) {
      return { changes: [], error: e.message }
    }
  }, [left, right])

  const stats = useMemo(() => {
    if (mode === 'text' && textDiffResult) {
      let added = 0, removed = 0, unchanged = 0
      textDiffResult.forEach((part) => {
        const lines = part.value.split('\n').filter(Boolean).length
        if (part.added) added += lines
        else if (part.removed) removed += lines
        else unchanged += lines
      })
      return { added, removed, unchanged }
    }
    if (mode === 'json' && jsonDiffResult && !jsonDiffResult.error) {
      let added = 0, removed = 0, modified = 0
      jsonDiffResult.changes.forEach((c) => {
        if (c.kind === 'N') added++
        else if (c.kind === 'D') removed++
        else modified++
      })
      return { added, removed, unchanged: modified }
    }
    return null
  }, [mode, textDiffResult, jsonDiffResult])

  const diffLines2 = useMemo(() => {
    if (!textDiffResult) return []
    const lines = []
    let removedBuffer = []

    textDiffResult.forEach((part) => {
      const rawLines = part.value.split('\n')
      if (!rawLines[rawLines.length - 1]) rawLines.pop()

      if (part.removed) {
        removedBuffer.push(...rawLines)
      } else if (part.added && removedBuffer.length > 0) {
        const maxLen = Math.max(removedBuffer.length, rawLines.length)
        for (let i = 0; i < maxLen; i++) {
          if (i < removedBuffer.length && i < rawLines.length) {
            lines.push({ type: 'changed', oldText: removedBuffer[i], newText: rawLines[i] })
          } else if (i < removedBuffer.length) {
            lines.push({ type: 'removed', text: removedBuffer[i] })
          } else {
            lines.push({ type: 'added', text: rawLines[i] })
          }
        }
        removedBuffer = []
      } else {
        removedBuffer.forEach((rl) => lines.push({ type: 'removed', text: rl }))
        removedBuffer = []
        rawLines.forEach((line) => {
          lines.push({ type: part.added ? 'added' : 'unchanged', text: line })
        })
      }
    })
    removedBuffer.forEach((rl) => lines.push({ type: 'removed', text: rl }))
    return lines
  }, [textDiffResult])

  // Per-line decision tracking: each line index maps to 'accepted' | 'rejected' | undefined
  const [decisions, setDecisions] = useState({})

  // Reset decisions when diff changes
  useEffect(() => { setDecisions({}) }, [left, right])

  // Build merged output from decisions
  const merged = useMemo(() => {
    if (!diffLines2.length) return ''
    const result = []
    diffLines2.forEach((line, i) => {
      const dec = decisions[i]
      if (line.type === 'unchanged') {
        result.push(line.text)
      } else if (line.type === 'changed') {
        if (dec === 'rejected') result.push(line.oldText)
        else result.push(line.newText)
      } else if (line.type === 'added') {
        if (dec !== 'rejected') result.push(line.text)
      } else if (line.type === 'removed') {
        if (dec === 'accepted') result.push(line.text)
      }
    })
    return result.join('\n')
  }, [diffLines2, decisions])

  const [manualMerge, setManualMerge] = useState('')
  const [showMerge, setShowMerge] = useState(false)
  const hasAnyDecision = Object.keys(decisions).length > 0

  const [jsonDecisions, setJsonDecisions] = useState({})
  const [showJsonMerge, setShowJsonMerge] = useState(false)

  useEffect(() => { setJsonDecisions({}) }, [left, right])

  const decideJsonChange = useCallback((index, decision) => {
    setJsonDecisions((prev) => ({ ...prev, [index]: decision }))
    setShowJsonMerge(true)
  }, [])

  const mergedJson = useMemo(() => {
    if (!jsonDiffResult || jsonDiffResult.error || !jsonDiffResult.changes.length) return null
    try {
      const base = JSON.parse(left)
      jsonDiffResult.changes.forEach((change, i) => {
        if (jsonDecisions[i] === 'accepted') applyChange(base, null, change)
      })
      return JSON.stringify(base, null, 2)
    } catch { return null }
  }, [left, jsonDiffResult, jsonDecisions])

  const acceptAllJson = useCallback(() => {
    if (!jsonDiffResult) return
    const d = {}
    jsonDiffResult.changes.forEach((_, i) => { d[i] = 'accepted' })
    setJsonDecisions(d)
    setShowJsonMerge(true)
    toast.success('All JSON changes accepted')
  }, [jsonDiffResult])

  // Sync computed merge into the editable textarea when decisions change
  useEffect(() => {
    if (hasAnyDecision && showMerge) {
      setManualMerge(merged)
    }
  }, [merged, hasAnyDecision, showMerge])

  const decideLine = useCallback((index, decision) => {
    setDecisions((prev) => ({ ...prev, [index]: decision }))
    setShowMerge(true)
  }, [])

  const acceptAll = useCallback(() => {
    const d = {}
    diffLines2.forEach((line, i) => {
      if (line.type === 'added' || line.type === 'changed') d[i] = 'accepted'
      else if (line.type === 'removed') d[i] = 'rejected'
    })
    setDecisions(d)
    setShowMerge(true)
    toast.success('All changes accepted')
  }, [diffLines2])

  const resetMerge = useCallback(() => {
    setDecisions({})
    setManualMerge(left)
    toast.success('Reset to original')
  }, [left])

  const inputStyle = {
    background: 'var(--bg)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    padding: '14px 16px',
    color: 'var(--text)',
    fontFamily: 'var(--font-code)',
    fontSize: 13,
    resize: 'none',
  }

  return (
    <div>
      <ToolHeader toolId="diff" title="Diff Tool" description="Compare text or JSON side by side">
        <div className="flex items-center gap-4">
          {stats && (
            <div className="flex gap-2">
              <span className="text-xs px-2.5 py-1 font-medium" style={{ background: 'rgba(34,197,94,0.12)', color: '#22C55E', borderRadius: 999 }}>+{stats.added}</span>
              <span className="text-xs px-2.5 py-1 font-medium" style={{ background: 'rgba(239,68,68,0.12)', color: '#EF4444', borderRadius: 999 }}>-{stats.removed}</span>
              <span className="text-xs px-2.5 py-1 font-medium" style={{ background: 'rgba(107,114,128,0.12)', color: 'var(--text-muted)', borderRadius: 999 }}>~{stats.unchanged}</span>
            </div>
          )}
          <div className="tab-pills">
            <button className={`tab-pill ${mode === 'text' ? 'active' : ''}`} onClick={() => setMode('text')}>Text</button>
            <button className={`tab-pill ${mode === 'json' ? 'active' : ''}`} onClick={() => setMode('json')}>JSON</button>
          </div>
        </div>
      </ToolHeader>

      <div className="flex gap-3 items-stretch mb-4">
        <div className="flex-1 forge-card" style={{ padding: 0, display: 'flex', flexDirection: 'column' }}>
          <div className="flex items-center justify-between" style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)' }}>
            <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Original</span>
            <button onClick={() => leftFileRef.current?.click()} className="forge-btn" style={{ padding: '3px 8px', fontSize: 11 }}>
              <Upload size={11} /> Upload
            </button>
            <input ref={leftFileRef} type="file" onChange={loadFile('left')} className="hidden" />
          </div>
          <DropZone
            compact
            onFile={onDropLeftFile}
            accept={DIFF_ACCEPT}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}
          >
            <textarea value={left} onChange={(e) => setLeft(e.target.value)} rows={14}
              className="w-full flex-1 outline-none" style={{ ...inputStyle, border: 'none', borderRadius: 0 }}
              placeholder="Paste original content..." />
          </DropZone>
        </div>

        <div className="flex items-center">
          <button onClick={swap} className="cursor-pointer transition-colors duration-150"
            style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            title="Swap">
            <ArrowLeftRight size={14} />
          </button>
        </div>

        <div className="flex-1 forge-card" style={{ padding: 0, display: 'flex', flexDirection: 'column' }}>
          <div className="flex items-center justify-between" style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)' }}>
            <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Modified</span>
            <button onClick={() => rightFileRef.current?.click()} className="forge-btn" style={{ padding: '3px 8px', fontSize: 11 }}>
              <Upload size={11} /> Upload
            </button>
            <input ref={rightFileRef} type="file" onChange={loadFile('right')} className="hidden" />
          </div>
          <DropZone
            compact
            onFile={onDropRightFile}
            accept={DIFF_ACCEPT}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}
          >
            <textarea value={right} onChange={(e) => setRight(e.target.value)} rows={14}
              className="w-full flex-1 outline-none" style={{ ...inputStyle, border: 'none', borderRadius: 0 }}
              placeholder="Paste modified content..." />
          </DropZone>
        </div>
      </div>

      {/* Diff output */}
      <div className="forge-card" style={{ padding: 0, overflow: 'hidden', marginBottom: 16 }}>
        <div className="flex items-center justify-between" style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)' }}>
          <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Diff Output</span>
          {mode === 'text' && left && right && (
            <div className="flex gap-2">
              <button onClick={acceptAll} className="forge-btn" style={{ padding: '4px 10px', fontSize: 11 }}>
                <CheckCheck size={12} /> Accept All
              </button>
              <button onClick={() => { setDecisions({}); setManualMerge(left); setShowMerge(true) }} className="forge-btn" style={{ padding: '4px 10px', fontSize: 11 }}>
                <RotateCcw size={12} /> Use Original
              </button>
            </div>
          )}
          {mode === 'json' && jsonDiffResult && !jsonDiffResult.error && jsonDiffResult.changes.length > 0 && (
            <div className="flex gap-2">
              <button onClick={acceptAllJson} className="forge-btn" style={{ padding: '4px 10px', fontSize: 11 }}>
                <CheckCheck size={12} /> Accept All
              </button>
              <button onClick={() => { setJsonDecisions({}); setShowJsonMerge(false) }} className="forge-btn" style={{ padding: '4px 10px', fontSize: 11 }}>
                <RotateCcw size={12} /> Reset
              </button>
            </div>
          )}
        </div>
        <div className="overflow-auto" style={{ maxHeight: 420, fontFamily: 'var(--font-code)', fontSize: 13 }}>
          {(!left && !right) ? (
            <div className="text-center py-12 text-sm" style={{ color: 'var(--text-muted)' }}>
              Enter content on both sides to see the diff
            </div>
          ) : mode === 'text' ? (
            diffLines2.map((line, i) => {
              const isAdded = line.type === 'added'
              const isRemoved = line.type === 'removed'
              const isChanged = line.type === 'changed'
              const dec = decisions[i]
              const isDecided = dec !== undefined
              return (
                <div key={i} className="flex" style={{
                  background: isDecided
                    ? 'color-mix(in srgb, var(--accent) 6%, transparent)'
                    : (isAdded || isChanged ? 'rgba(34,197,94,0.06)' : isRemoved ? 'rgba(239,68,68,0.06)' : (i % 2 === 0 ? 'var(--surface-hover)' : 'transparent')),
                  borderLeft: `3px solid ${isDecided ? 'var(--accent)' : (isAdded || isChanged ? '#22C55E' : isRemoved ? '#EF4444' : 'transparent')}`,
                  minHeight: 28, alignItems: 'center',
                  opacity: isDecided ? 0.7 : 1,
                }}>
                  <span style={{ width: 40, textAlign: 'right', padding: '0 8px 0 0', color: 'var(--text-muted)', opacity: 0.4, fontSize: 11, flexShrink: 0, userSelect: 'none' }}>{i + 1}</span>
                  <span style={{ width: 20, textAlign: 'center', color: isDecided ? 'var(--accent)' : (isAdded || isChanged ? '#22C55E' : isRemoved ? '#EF4444' : 'transparent'), flexShrink: 0, userSelect: 'none', fontSize: 11 }}>
                    {isDecided ? '✓' : (isAdded || isChanged ? '~' : isRemoved ? '-' : '')}
                  </span>
                  <span style={{ padding: '4px 8px 4px 4px', flex: 1, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                    {isChanged ? (
                      <WordDiff oldText={line.oldText} newText={line.newText} type="changed" />
                    ) : (
                      <span style={{ color: isAdded ? '#22C55E' : isRemoved ? '#EF4444' : 'var(--text)' }}>
                        {line.text}
                      </span>
                    )}
                  </span>
                  {(isAdded || isChanged) && !isDecided && (
                    <button onClick={() => decideLine(i, 'accepted')} title="Accept this change"
                      className="cursor-pointer" style={{ background: 'none', border: 'none', color: '#22C55E', padding: '0 8px', flexShrink: 0, opacity: 0.6 }}>
                      <Check size={13} />
                    </button>
                  )}
                  {(isAdded || isChanged) && !isDecided && (
                    <button onClick={() => decideLine(i, 'rejected')} title="Reject this change"
                      className="cursor-pointer" style={{ background: 'none', border: 'none', color: '#EF4444', padding: '0 4px 0 0', flexShrink: 0, opacity: 0.6 }}>
                      <X size={13} />
                    </button>
                  )}
                  {isRemoved && !isDecided && (
                    <button onClick={() => decideLine(i, 'accepted')} title="Keep this removed line"
                      className="cursor-pointer" style={{ background: 'none', border: 'none', color: '#22C55E', padding: '0 8px', flexShrink: 0, opacity: 0.6 }}>
                      <Plus size={13} />
                    </button>
                  )}
                  {isRemoved && !isDecided && (
                    <button onClick={() => decideLine(i, 'rejected')} title="Drop this line"
                      className="cursor-pointer" style={{ background: 'none', border: 'none', color: '#EF4444', padding: '0 4px 0 0', flexShrink: 0, opacity: 0.6 }}>
                      <X size={13} />
                    </button>
                  )}
                </div>
              )
            })
          ) : (
            jsonDiffResult?.error ? (
              <div className="py-6 px-5" style={{ color: '#EF4444', fontSize: 13 }}>JSON parse error: {jsonDiffResult.error}</div>
            ) : jsonDiffResult?.changes.length === 0 ? (
              <div className="py-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>No differences found</div>
            ) : (
              <div style={{ padding: '8px 0' }}>
                {jsonDiffResult?.changes.map((change, i) => {
                  const desc = describeChange(change)
                  const jd = jsonDecisions[i]
                  return (
                    <div key={i} className="flex items-center gap-3"
                      style={{ padding: '10px 16px', borderLeft: `3px solid ${jd ? 'var(--accent)' : desc.border}`, background: jd ? 'color-mix(in srgb, var(--accent) 6%, transparent)' : desc.bg, margin: '0 0 1px 0', opacity: jd ? 0.7 : 1 }}>
                      {jd ? <span style={{ color: 'var(--accent)', fontSize: 11 }}>✓</span> : <desc.icon size={14} style={{ color: desc.color, flexShrink: 0 }} />}
                      <span style={{ color: jd ? 'var(--text-muted)' : desc.color, fontSize: 13, flex: 1 }}>{desc.text}</span>
                      {!jd && (
                        <>
                          <button onClick={() => decideJsonChange(i, 'accepted')} title="Accept" className="cursor-pointer" style={{ background: 'none', border: 'none', color: '#22C55E', padding: '0 4px', opacity: 0.6 }}><Check size={13} /></button>
                          <button onClick={() => decideJsonChange(i, 'rejected')} title="Reject" className="cursor-pointer" style={{ background: 'none', border: 'none', color: '#EF4444', padding: '0 4px', opacity: 0.6 }}><X size={13} /></button>
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
            )
          )}
        </div>
      </div>

      {/* JSON Merged output */}
      {showJsonMerge && mode === 'json' && mergedJson && (
        <div className="forge-card" style={{ padding: 0, overflow: 'hidden', marginBottom: 16 }}>
          <div className="flex items-center justify-between" style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)' }}>
            <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Merged JSON
              <span style={{ opacity: 0.5, marginLeft: 8 }}>({Object.keys(jsonDecisions).length} decision{Object.keys(jsonDecisions).length !== 1 ? 's' : ''})</span>
            </span>
            <div className="flex gap-2">
              <button onClick={() => { navigator.clipboard.writeText(mergedJson); toast.success('Copied') }} className="forge-btn" style={{ padding: '4px 10px', fontSize: 11 }}>
                <Copy size={12} /> Copy
              </button>
              <button onClick={() => setShowJsonMerge(false)} className="forge-btn" style={{ padding: '4px 8px' }}>
                <X size={12} />
              </button>
            </div>
          </div>
          <pre style={{ padding: '14px 16px', margin: 0, fontFamily: 'var(--font-code)', fontSize: 13, color: 'var(--text)', overflowX: 'auto', maxHeight: 400, lineHeight: 1.6 }}>{mergedJson}</pre>
        </div>
      )}

      {/* Merged output -- auto-shown when any line decision is made */}
      {showMerge && mode === 'text' && (
        <div className="forge-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="flex items-center justify-between" style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)' }}>
            <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Merged Output
              {hasAnyDecision && <span style={{ opacity: 0.5, marginLeft: 8 }}>({Object.keys(decisions).length} decision{Object.keys(decisions).length !== 1 ? 's' : ''})</span>}
            </span>
            <div className="flex gap-2">
              <button onClick={() => { navigator.clipboard.writeText(manualMerge || merged); toast.success('Copied') }} className="forge-btn" style={{ padding: '4px 10px', fontSize: 11 }}>
                <Copy size={12} /> Copy
              </button>
              <button onClick={resetMerge} className="forge-btn" style={{ padding: '4px 10px', fontSize: 11 }}>
                <RotateCcw size={12} /> Reset
              </button>
              <button onClick={() => setShowMerge(false)} className="forge-btn" style={{ padding: '4px 8px' }}>
                <X size={12} />
              </button>
            </div>
          </div>
          <textarea
            value={manualMerge || merged}
            onChange={(e) => setManualMerge(e.target.value)}
            rows={14}
            className="w-full outline-none"
            style={{ ...inputStyle, border: 'none', borderRadius: 0, minHeight: 200 }}
            placeholder="Merged content appears here..."
          />
        </div>
      )}
    </div>
  )
}
