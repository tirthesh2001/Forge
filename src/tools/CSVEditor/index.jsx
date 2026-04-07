import { useState, useCallback, useRef, useMemo } from 'react'
import Papa from 'papaparse'
import {
  Upload, ClipboardPaste, Download, Copy, Plus, Trash2,
  ArrowUpDown, Wand2, X, Table, FileSpreadsheet, Sparkles,
} from 'lucide-react'
import toast from 'react-hot-toast'
import useCloudState from '../../hooks/useCloudState'
import ToolHeader from '../../components/ToolHeader'
import { copyWithHistory } from '../../utils/copyWithHistory'
import DropZone from '../../components/DropZone'

const FIRST_NAMES = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Hank', 'Ivy', 'Jack']
const LAST_NAMES = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Wilson', 'Moore']
const DOMAINS = ['example.com', 'test.org', 'demo.io', 'mail.co', 'corp.net']

function generateValue(type) {
  switch (type) {
    case 'Name': return `${FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)]} ${LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)]}`
    case 'Email': { const f = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)].toLowerCase(); return `${f}${Math.floor(Math.random() * 100)}@${DOMAINS[Math.floor(Math.random() * DOMAINS.length)]}` }
    case 'Date': { const y = 2020 + Math.floor(Math.random() * 6); const m = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0'); const d = String(Math.floor(Math.random() * 28) + 1).padStart(2, '0'); return `${y}-${m}-${d}` }
    case 'Number': return String(Math.floor(Math.random() * 10000))
    case 'UUID': return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => { const r = (Math.random() * 16) | 0; return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16) })
    case 'Boolean': return Math.random() > 0.5 ? 'true' : 'false'
    default: return ''
  }
}

const CSV_ACCEPT = '.csv,.tsv,.txt'

export default function CSVEditor() {
  const [headers, setHeaders] = useCloudState('csv-headers', [])
  const [rows, setRows] = useCloudState('csv-rows', [])
  const [sortCol, setSortCol] = useState(null)
  const [sortAsc, setSortAsc] = useState(true)
  const [pasteModal, setPasteModal] = useState(false)
  const [pasteText, setPasteText] = useState('')
  const [generatorOpen, setGeneratorOpen] = useState(false)
  const [genCols, setGenCols] = useState([{ name: 'Name', type: 'Name' }, { name: 'Email', type: 'Email' }])
  const [genCount, setGenCount] = useState(10)
  const [editingHeader, setEditingHeader] = useState(null)
  const fileInputRef = useRef(null)

  const hasData = headers.length > 0

  const parseCSV = useCallback((text) => {
    const result = Papa.parse(text.trim(), { header: false, skipEmptyLines: true })
    if (result.data.length > 0) {
      setHeaders(result.data[0])
      setRows(result.data.slice(1))
      setSortCol(null)
      toast.success(`Loaded ${result.data.length - 1} rows`)
    }
  }, [])

  const loadPapaFile = useCallback((file) => {
    if (file.size > 5 * 1024 * 1024) {
      toast('Large file detected. Processing may take a moment.', { icon: '⚠️' })
    }
    Papa.parse(file, {
      header: false, skipEmptyLines: true,
      complete: (result) => {
        if (result.data.length > 0) {
          setHeaders(result.data[0])
          setRows(result.data.slice(1))
          setSortCol(null)
          toast.success(`Loaded ${result.data.length - 1} rows`)
        }
      },
    })
  }, [])

  const uploadFile = useCallback((e) => {
    const file = e.target.files[0]
    if (!file) return
    loadPapaFile(file)
  }, [loadPapaFile])

  const sortedRows = useMemo(() => {
    if (sortCol === null) return rows
    return [...rows].sort((a, b) => {
      const cmp = (a[sortCol] ?? '').localeCompare(b[sortCol] ?? '', undefined, { numeric: true })
      return sortAsc ? cmp : -cmp
    })
  }, [rows, sortCol, sortAsc])

  const handleSort = useCallback((idx) => {
    if (sortCol === idx) setSortAsc((a) => !a)
    else { setSortCol(idx); setSortAsc(true) }
  }, [sortCol])

  const updateCell = useCallback((rowIdx, colIdx, value) => {
    setRows((prev) => {
      const actualIdx = sortCol !== null ? rows.indexOf(sortedRows[rowIdx]) : rowIdx
      const next = prev.map((r) => [...r])
      next[actualIdx][colIdx] = value
      return next
    })
  }, [sortCol, rows, sortedRows])

  const renameHeader = useCallback((idx, name) => {
    setHeaders((prev) => { const n = [...prev]; n[idx] = name; return n })
    setEditingHeader(null)
  }, [])

  const addRow = useCallback(() => { setRows((prev) => [...prev, Array(headers.length).fill('')]) }, [headers])
  const addColumn = useCallback(() => { setHeaders((prev) => [...prev, `Column ${prev.length + 1}`]); setRows((prev) => prev.map((r) => [...r, ''])) }, [])
  const deleteRow = useCallback((idx) => { const ai = sortCol !== null ? rows.indexOf(sortedRows[idx]) : idx; setRows((prev) => prev.filter((_, i) => i !== ai)) }, [sortCol, rows, sortedRows])
  const deleteColumn = useCallback((idx) => { setHeaders((prev) => prev.filter((_, i) => i !== idx)); setRows((prev) => prev.map((r) => r.filter((_, i) => i !== idx))); if (sortCol === idx) setSortCol(null) }, [sortCol])

  const downloadCSV = useCallback(() => { const csv = Papa.unparse([headers, ...rows]); const b = new Blob([csv], { type: 'text/csv' }); const u = URL.createObjectURL(b); const a = document.createElement('a'); a.href = u; a.download = 'data.csv'; a.click(); URL.revokeObjectURL(u); toast.success('CSV downloaded') }, [headers, rows])
  const copyTSV = useCallback(() => {
    copyWithHistory([headers.join('\t'), ...rows.map((r) => r.join('\t'))].join('\n'), 'Copied as TSV')
  }, [headers, rows])
  const copyJSON = useCallback(() => {
    const arr = rows.map((r) => { const obj = {}; headers.forEach((h, i) => { obj[h] = r[i] ?? '' }); return obj })
    copyWithHistory(JSON.stringify(arr, null, 2), 'Copied as JSON')
  }, [headers, rows])

  const generateDummy = useCallback(() => {
    setHeaders(genCols.map((c) => c.name))
    setRows(Array.from({ length: genCount }, () => genCols.map((c) => generateValue(c.type))))
    setSortCol(null)
    setGeneratorOpen(false)
    toast.success(`Generated ${genCount} rows`)
  }, [genCols, genCount])

  if (!hasData) {
    return (
      <div>
        <ToolHeader toolId="csv" title="CSV Editor" description="Import, edit, and export CSV data" />

        <div className="forge-card" style={{ padding: '48px 24px' }}>
          <div className="text-center mb-8">
            <Table size={36} style={{ color: 'var(--text-muted)', opacity: 0.3, margin: '0 auto 12px' }} />
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No data loaded. Choose an import method to get started.</p>
          </div>
          <DropZone
            onFile={loadPapaFile}
            accept={CSV_ACCEPT}
            label="Drop a CSV file here or click to browse"
            style={{ marginBottom: 24 }}
          />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, maxWidth: 600, margin: '0 auto' }}>
            <button
              onClick={() => setPasteModal(true)}
              className="flex flex-col items-center gap-3 cursor-pointer transition-all duration-150"
              style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '28px 16px' }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--accent)'}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
            >
              <ClipboardPaste size={22} style={{ color: 'var(--accent)' }} />
              <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>Paste CSV</span>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>From clipboard</span>
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center gap-3 cursor-pointer transition-all duration-150"
              style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '28px 16px' }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--accent)'}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
            >
              <FileSpreadsheet size={22} style={{ color: 'var(--accent)' }} />
              <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>Upload File</span>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>.csv, .tsv, .txt</span>
            </button>
            <button
              onClick={() => setGeneratorOpen(true)}
              className="flex flex-col items-center gap-3 cursor-pointer transition-all duration-150"
              style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '28px 16px' }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--accent)'}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
            >
              <Sparkles size={22} style={{ color: 'var(--accent)' }} />
              <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>Generate</span>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Dummy data</span>
            </button>
          </div>
          <input ref={fileInputRef} type="file" accept={CSV_ACCEPT} onChange={uploadFile} className="hidden" />
        </div>

        {pasteModal && <PasteModal text={pasteText} setText={setPasteText} onParse={() => { parseCSV(pasteText); setPasteModal(false); setPasteText('') }} onClose={() => setPasteModal(false)} />}
        {generatorOpen && <GeneratorPanel genCols={genCols} setGenCols={setGenCols} genCount={genCount} setGenCount={setGenCount} onGenerate={generateDummy} onClose={() => setGeneratorOpen(false)} />}
      </div>
    )
  }

  return (
    <div>
      <ToolHeader toolId="csv" title="CSV Editor" description={`${rows.length} rows, ${headers.length} columns`} />

      {/* Toolbar */}
      <div className="forge-toolbar">
        <button onClick={() => setPasteModal(true)} className="forge-btn"><ClipboardPaste size={13} /> Paste</button>
        <button onClick={() => fileInputRef.current?.click()} className="forge-btn"><Upload size={13} /> Upload</button>
        <div className="divider" />
        <button onClick={addRow} className="forge-btn"><Plus size={13} /> Row</button>
        <button onClick={addColumn} className="forge-btn"><Plus size={13} /> Column</button>
        <div className="divider" />
        <button onClick={downloadCSV} className="forge-btn"><Download size={13} /> CSV</button>
        <button onClick={copyTSV} className="forge-btn"><Copy size={13} /> TSV</button>
        <button onClick={copyJSON} className="forge-btn"><Copy size={13} /> JSON</button>
        <div className="divider" />
        <button onClick={() => setGeneratorOpen(true)} className="forge-btn"><Wand2 size={13} /> Generate</button>
        <input ref={fileInputRef} type="file" accept={CSV_ACCEPT} onChange={uploadFile} className="hidden" />
      </div>

      {/* Table */}
      <DropZone
        compact
        onFile={loadPapaFile}
        accept={CSV_ACCEPT}
        style={{ display: 'block' }}
      >
        <div className="forge-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="overflow-auto" style={{ maxHeight: 'calc(100vh - 260px)' }}>
            <table className="w-full" style={{ borderCollapse: 'collapse', fontFamily: 'var(--font-code)', fontSize: 13 }}>
              <thead>
                <tr>
                  <th style={{ width: 40, background: 'var(--bg)', position: 'sticky', top: 0, zIndex: 2, borderBottom: '1px solid var(--border)' }} />
                  {headers.map((h, i) => (
                    <th
                      key={i}
                      className="group relative cursor-pointer select-none"
                      style={{
                        background: 'var(--bg)',
                        position: 'sticky', top: 0, zIndex: 2,
                        padding: '10px 14px', textAlign: 'left', fontWeight: 600,
                        color: 'var(--text)', borderBottom: '1px solid var(--border)',
                        borderRight: '1px solid var(--border)', whiteSpace: 'nowrap',
                      }}
                      onClick={() => handleSort(i)}
                      onDoubleClick={(e) => { e.stopPropagation(); setEditingHeader(i) }}
                    >
                      {editingHeader === i ? (
                        <input
                          autoFocus defaultValue={h}
                          onBlur={(e) => renameHeader(i, e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') renameHeader(i, e.target.value) }}
                          onClick={(e) => e.stopPropagation()}
                          className="outline-none"
                          style={{ background: 'var(--bg)', border: '1px solid var(--accent)', borderRadius: 4, padding: '2px 8px', color: 'var(--text)', width: '100%', fontFamily: 'var(--font-code)', fontSize: 13 }}
                        />
                      ) : (
                        <span className="flex items-center gap-1.5">
                          {h}
                          {sortCol === i && <ArrowUpDown size={11} style={{ color: 'var(--accent)' }} />}
                        </span>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteColumn(i) }}
                        className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity"
                        style={{ background: 'none', border: 'none', color: '#EF4444', padding: 2 }}
                      >
                        <Trash2 size={11} />
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedRows.map((row, ri) => (
                  <tr key={ri} className="group" style={{ background: ri % 2 === 0 ? 'var(--surface)' : 'var(--bg)' }}>
                    <td style={{ borderBottom: '1px solid var(--border)', textAlign: 'center', verticalAlign: 'middle' }}>
                      <button
                        onClick={() => deleteRow(ri)}
                        className="opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity"
                        style={{ background: 'none', border: 'none', color: '#EF4444', padding: 2 }}
                      >
                        <Trash2 size={11} />
                      </button>
                    </td>
                    {headers.map((_, ci) => (
                      <td key={ci} style={{ borderBottom: '1px solid var(--border)', borderRight: '1px solid var(--border)', padding: 0 }}>
                        <input
                          value={row[ci] ?? ''}
                          onChange={(e) => updateCell(ri, ci, e.target.value)}
                          className="w-full outline-none"
                          style={{ background: 'transparent', border: 'none', padding: '8px 14px', color: 'var(--text)', fontFamily: 'var(--font-code)', fontSize: 13 }}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </DropZone>

      {pasteModal && <PasteModal text={pasteText} setText={setPasteText} onParse={() => { parseCSV(pasteText); setPasteModal(false); setPasteText('') }} onClose={() => setPasteModal(false)} />}
      {generatorOpen && <GeneratorPanel genCols={genCols} setGenCols={setGenCols} genCount={genCount} setGenCount={setGenCount} onGenerate={generateDummy} onClose={() => setGeneratorOpen(false)} />}
    </div>
  )
}

function PasteModal({ text, setText, onParse, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-lg flex flex-col" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
        <div className="flex items-center justify-between" style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
          <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Paste CSV</span>
          <button onClick={onClose} className="cursor-pointer" style={{ background: 'none', border: 'none', color: 'var(--text-muted)' }}><X size={16} /></button>
        </div>
        <div style={{ padding: 20 }}>
          <textarea
            value={text} onChange={(e) => setText(e.target.value)}
            rows={10} placeholder="Paste CSV content here..."
            className="w-full outline-none resize-none"
            style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '14px 16px', color: 'var(--text)', fontFamily: 'var(--font-code)', fontSize: 13 }}
          />
        </div>
        <div className="flex justify-end gap-2" style={{ padding: '14px 20px', borderTop: '1px solid var(--border)' }}>
          <button onClick={onClose} className="forge-btn">Cancel</button>
          <button onClick={onParse} disabled={!text.trim()} className="forge-btn forge-btn-primary">Parse</button>
        </div>
      </div>
    </div>
  )
}

function GeneratorPanel({ genCols, setGenCols, genCount, setGenCount, onGenerate, onClose }) {
  const TYPES = ['Name', 'Email', 'Date', 'Number', 'UUID', 'Boolean']
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-md flex flex-col" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
        <div className="flex items-center justify-between" style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
          <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Generate Dummy Data</span>
          <button onClick={onClose} className="cursor-pointer" style={{ background: 'none', border: 'none', color: 'var(--text-muted)' }}><X size={16} /></button>
        </div>
        <div className="flex flex-col gap-3" style={{ padding: 20 }}>
          {genCols.map((col, i) => (
            <div key={i} className="flex gap-2 items-center">
              <input
                value={col.name}
                onChange={(e) => setGenCols((prev) => { const n = [...prev]; n[i] = { ...n[i], name: e.target.value }; return n })}
                placeholder="Column name"
                className="flex-1 outline-none text-sm"
                style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px 12px', color: 'var(--text)' }}
              />
              <select
                value={col.type}
                onChange={(e) => setGenCols((prev) => { const n = [...prev]; n[i] = { ...n[i], type: e.target.value }; return n })}
                className="text-sm outline-none cursor-pointer"
                style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px 12px', color: 'var(--text)' }}
              >
                {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <button onClick={() => setGenCols((prev) => prev.filter((_, j) => j !== i))} className="cursor-pointer" style={{ background: 'none', border: 'none', color: '#EF4444' }}>
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          <button
            onClick={() => setGenCols((prev) => [...prev, { name: `Col${prev.length + 1}`, type: 'Name' }])}
            className="flex items-center gap-1 text-xs cursor-pointer self-start"
            style={{ background: 'none', border: 'none', color: 'var(--accent)', padding: '4px 0' }}
          >
            <Plus size={14} /> Add Column
          </button>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Rows:</span>
            <input
              type="number" min={1} max={1000} value={genCount}
              onChange={(e) => setGenCount(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-20 outline-none text-sm"
              style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px 12px', color: 'var(--text)' }}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2" style={{ padding: '14px 20px', borderTop: '1px solid var(--border)' }}>
          <button onClick={onClose} className="forge-btn">Cancel</button>
          <button onClick={onGenerate} disabled={genCols.length === 0} className="forge-btn forge-btn-primary">Generate</button>
        </div>
      </div>
    </div>
  )
}
