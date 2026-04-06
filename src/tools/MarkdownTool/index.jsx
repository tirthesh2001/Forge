import { useMemo } from 'react'
import { marked } from 'marked'
import { Copy, Bold, Italic, Heading1, Link, Code, List } from 'lucide-react'
import toast from 'react-hot-toast'
import useCloudState from '../../hooks/useCloudState'
import ToolHeader from '../../components/ToolHeader'

const SAMPLE = `# Hello Forge

This is **bold** and *italic* text.

## Features
- Live preview
- Syntax highlighting
- Toolbar helpers

\`\`\`javascript
const greeting = "Hello, World!";
console.log(greeting);
\`\`\`

> A blockquote for emphasis

[Visit GitHub](https://github.com)
`

marked.setOptions({ breaks: true, gfm: true })

export default function MarkdownTool() {
  const [md, setMd] = useCloudState('markdown-content', SAMPLE)

  const html = useMemo(() => {
    try { return marked.parse(md || '') }
    catch { return '<p style="color:#EF4444">Parse error</p>' }
  }, [md])

  const insert = (before, after = '') => {
    const ta = document.getElementById('md-editor')
    if (!ta) return
    const start = ta.selectionStart
    const end = ta.selectionEnd
    const selected = md.slice(start, end) || 'text'
    const newText = md.slice(0, start) + before + selected + after + md.slice(end)
    setMd(newText)
    setTimeout(() => { ta.focus(); ta.setSelectionRange(start + before.length, start + before.length + selected.length) }, 0)
  }

  return (
    <div>
      <ToolHeader toolId="markdown" title="Markdown Preview" description="Edit markdown with live rendered preview" />

      <div className="forge-toolbar" style={{ marginBottom: 12 }}>
        <button onClick={() => insert('**', '**')} className="forge-btn" style={{ padding: '5px 8px' }} title="Bold"><Bold size={14} /></button>
        <button onClick={() => insert('*', '*')} className="forge-btn" style={{ padding: '5px 8px' }} title="Italic"><Italic size={14} /></button>
        <button onClick={() => insert('## ')} className="forge-btn" style={{ padding: '5px 8px' }} title="Heading"><Heading1 size={14} /></button>
        <button onClick={() => insert('[', '](url)')} className="forge-btn" style={{ padding: '5px 8px' }} title="Link"><Link size={14} /></button>
        <button onClick={() => insert('`', '`')} className="forge-btn" style={{ padding: '5px 8px' }} title="Code"><Code size={14} /></button>
        <button onClick={() => insert('- ')} className="forge-btn" style={{ padding: '5px 8px' }} title="List"><List size={14} /></button>
        <div className="divider" />
        <button onClick={() => { navigator.clipboard.writeText(md); toast.success('Copied markdown') }} className="forge-btn" style={{ padding: '5px 8px', fontSize: 11 }}><Copy size={12} /> MD</button>
        <button onClick={() => { navigator.clipboard.writeText(html); toast.success('Copied HTML') }} className="forge-btn" style={{ padding: '5px 8px', fontSize: 11 }}><Copy size={12} /> HTML</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, minHeight: 500 }}>
        <div className="forge-card" style={{ padding: 0, display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '8px 16px', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Editor</span>
          </div>
          <textarea
            id="md-editor"
            value={md} onChange={(e) => setMd(e.target.value)}
            style={{
              flex: 1, width: '100%', background: 'var(--bg)', border: 'none', borderRadius: 0,
              padding: '14px 16px', color: 'var(--text)', fontFamily: 'var(--font-code)', fontSize: 13,
              resize: 'none', outline: 'none', lineHeight: 1.7,
            }}
            placeholder="Write markdown here..."
          />
        </div>

        <div className="forge-card" style={{ padding: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '8px 16px', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Preview</span>
          </div>
          <div
            className="markdown-preview"
            style={{ flex: 1, padding: '14px 20px', overflowY: 'auto', fontSize: 14, lineHeight: 1.7, color: 'var(--text)' }}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </div>
      </div>
    </div>
  )
}
