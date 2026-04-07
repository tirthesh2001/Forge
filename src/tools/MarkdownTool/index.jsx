import { useMemo, useCallback } from 'react'
import { marked } from 'marked'
import { Copy, Bold, Italic, Heading1, Link, Code, List, Download } from 'lucide-react'
import toast from 'react-hot-toast'
import useCloudState from '../../hooks/useCloudState'
import ToolHeader from '../../components/ToolHeader'
import { copyWithHistory } from '../../utils/copyWithHistory'

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

  const triggerDownload = useCallback((content, filename, mimeType) => {
    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
    toast.success(`Downloaded ${filename}`)
  }, [])

  const downloadMd = useCallback(() => {
    triggerDownload(md || '', 'document.md', 'text/markdown;charset=utf-8')
  }, [md, triggerDownload])

  const downloadHtml = useCallback(() => {
    const doc = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Markdown Export</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 40px auto; padding: 0 20px; line-height: 1.7; color: #1a1a2e; }
  h1, h2, h3 { font-weight: 700; margin: 1em 0 0.5em; }
  h1 { font-size: 1.75em; }
  h2 { font-size: 1.4em; border-bottom: 1px solid #e2e2e8; padding-bottom: 0.3em; }
  h3 { font-size: 1.15em; }
  p { margin: 0.5em 0; }
  ul, ol { padding-left: 1.5em; margin: 0.5em 0; }
  li { margin: 0.25em 0; }
  blockquote { border-left: 3px solid #00D4FF; padding: 0.5em 1em; margin: 0.5em 0; color: #6b7280; background: #f0fdff; }
  code { background: #f3f4f6; padding: 2px 6px; border-radius: 4px; font-size: 0.9em; font-family: 'JetBrains Mono', 'Fira Code', monospace; }
  pre { background: #f3f4f6; padding: 12px 16px; border-radius: 8px; overflow-x: auto; margin: 0.5em 0; }
  pre code { background: none; padding: 0; }
  a { color: #00D4FF; text-decoration: none; }
  a:hover { text-decoration: underline; }
  hr { border: none; border-top: 1px solid #e2e2e8; margin: 1em 0; }
  table { width: 100%; border-collapse: collapse; margin: 0.5em 0; }
  th, td { border: 1px solid #e2e2e8; padding: 8px 12px; text-align: left; }
  th { background: #f3f4f6; font-weight: 600; }
  img { max-width: 100%; border-radius: 8px; }
</style>
</head>
<body>
${html}
</body>
</html>`
    triggerDownload(doc, 'document.html', 'text/html;charset=utf-8')
  }, [html, triggerDownload])

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
        <button onClick={() => copyWithHistory(md, 'Copied markdown')} className="forge-btn" style={{ padding: '5px 8px', fontSize: 11 }}><Copy size={12} /> MD</button>
        <button onClick={() => copyWithHistory(html, 'Copied HTML')} className="forge-btn" style={{ padding: '5px 8px', fontSize: 11 }}><Copy size={12} /> HTML</button>
        <div className="divider" />
        <button onClick={downloadMd} className="forge-btn" style={{ padding: '5px 8px', fontSize: 11 }}><Download size={12} /> .md</button>
        <button onClick={downloadHtml} className="forge-btn" style={{ padding: '5px 8px', fontSize: 11 }}><Download size={12} /> .html</button>
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
