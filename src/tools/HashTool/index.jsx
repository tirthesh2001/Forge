import { useState, useEffect, useRef, useCallback } from 'react'
import { Copy, Upload } from 'lucide-react'
import toast from 'react-hot-toast'
import ToolHeader from '../../components/ToolHeader'
import DropZone from '../../components/DropZone'

function md5(str) {
  function M(d,_,r,f,i,n,h){return b(d+((_&r)|(~_&f))+i+h,n,_)}
  function T(d,_,r,f,i,n,h){return b(d+((_&f)|(r&~f))+i+h,n,_)}
  function C(d,_,r,f,i,n,h){return b(d+(_^r^f)+i+h,n,_)}
  function S(d,_,r,f,i,n,h){return b(d+(r^(_|~f))+i+h,n,_)}
  function b(d,_,r){return(d<<_|d>>>32-_)+r|0}
  function w(d){const _=[];for(let r=0;r<64;r+=4)_[r>>2]=d.charCodeAt(r)|(d.charCodeAt(r+1)<<8)|(d.charCodeAt(r+2)<<16)|(d.charCodeAt(r+3)<<24);return _}
  let e=unescape(encodeURIComponent(str)),l=e.length,a=[1732584193,-271733879,-1732584194,271733878],i
  for(i=64;i<=l;i+=64){const x=w(e.substring(i-64,i));let d=a[0],_=a[1],r=a[2],f=a[3]
  d=M(d,_,r,f,x[0],-680876936,7);f=M(f,d,_,r,x[1],-389564586,12);r=M(r,f,d,_,x[2],606105819,17);_=M(_,r,f,d,x[3],-1044525330,22)
  d=M(d,_,r,f,x[4],-176418897,7);f=M(f,d,_,r,x[5],1200080426,12);r=M(r,f,d,_,x[6],-1473231341,17);_=M(_,r,f,d,x[7],-45705983,22)
  d=M(d,_,r,f,x[8],1770035416,7);f=M(f,d,_,r,x[9],-1958414417,12);r=M(r,f,d,_,x[10],-42063,17);_=M(_,r,f,d,x[11],-1990404162,22)
  d=M(d,_,r,f,x[12],1804603682,7);f=M(f,d,_,r,x[13],-40341101,12);r=M(r,f,d,_,x[14],-1502002290,17);_=M(_,r,f,d,x[15],1236535329,22)
  d=T(d,_,r,f,x[1],-165796510,5);f=T(f,d,_,r,x[6],-1069501632,9);r=T(r,f,d,_,x[11],643717713,14);_=T(_,r,f,d,x[0],-373897302,20)
  d=T(d,_,r,f,x[5],-701558691,5);f=T(f,d,_,r,x[10],38016083,9);r=T(r,f,d,_,x[15],-660478335,14);_=T(_,r,f,d,x[4],-405537848,20)
  d=T(d,_,r,f,x[9],568446438,5);f=T(f,d,_,r,x[14],-1019803690,9);r=T(r,f,d,_,x[3],-187363961,14);_=T(_,r,f,d,x[8],1163531501,20)
  d=T(d,_,r,f,x[13],-1444681467,5);f=T(f,d,_,r,x[2],-51403784,9);r=T(r,f,d,_,x[7],1735328473,14);_=T(_,r,f,d,x[12],-1926607734,20)
  d=C(d,_,r,f,x[5],-378558,4);f=C(f,d,_,r,x[8],-2022574463,11);r=C(r,f,d,_,x[11],1839030562,16);_=C(_,r,f,d,x[14],-35309556,23)
  d=C(d,_,r,f,x[1],-1530992060,4);f=C(f,d,_,r,x[4],1272893353,11);r=C(r,f,d,_,x[7],-155497632,16);_=C(_,r,f,d,x[10],-1094730640,23)
  d=C(d,_,r,f,x[13],681279174,4);f=C(f,d,_,r,x[0],-358537222,11);r=C(r,f,d,_,x[3],-722521979,16);_=C(_,r,f,d,x[6],76029189,23)
  d=C(d,_,r,f,x[9],-640364487,4);f=C(f,d,_,r,x[12],-421815835,11);r=C(r,f,d,_,x[15],530742520,16);_=C(_,r,f,d,x[2],-995338651,23)
  d=S(d,_,r,f,x[0],-198630844,6);f=S(f,d,_,r,x[7],1126891415,10);r=S(r,f,d,_,x[14],-1416354905,15);_=S(_,r,f,d,x[5],-57434055,21)
  d=S(d,_,r,f,x[12],1700485571,6);f=S(f,d,_,r,x[3],-1894986606,10);r=S(r,f,d,_,x[10],-1051523,15);_=S(_,r,f,d,x[1],-2054922799,21)
  d=S(d,_,r,f,x[8],1873313359,6);f=S(f,d,_,r,x[15],-30611744,10);r=S(r,f,d,_,x[6],-1560198380,15);_=S(_,r,f,d,x[13],1309151649,21)
  d=S(d,_,r,f,x[4],-145523070,6);f=S(f,d,_,r,x[11],-1120210379,10);r=S(r,f,d,_,x[2],718787259,15);_=S(_,r,f,d,x[9],-343485551,21)
  a=[a[0]+d|0,a[1]+_|0,a[2]+r|0,a[3]+f|0]}
  e+='\x80';while(e.length%64-56)e+='\0';e+=String.fromCharCode(l*8&255,(l*8>>8)&255,(l*8>>16)&255,(l*8>>24)&255,0,0,0,0)
  for(;i<e.length+64;i+=64){const x=w(e.substring(i-64,i));let d=a[0],_=a[1],r=a[2],f=a[3]
  d=M(d,_,r,f,x[0],-680876936,7);f=M(f,d,_,r,x[1],-389564586,12);r=M(r,f,d,_,x[2],606105819,17);_=M(_,r,f,d,x[3],-1044525330,22)
  d=M(d,_,r,f,x[4],-176418897,7);f=M(f,d,_,r,x[5],1200080426,12);r=M(r,f,d,_,x[6],-1473231341,17);_=M(_,r,f,d,x[7],-45705983,22)
  d=M(d,_,r,f,x[8],1770035416,7);f=M(f,d,_,r,x[9],-1958414417,12);r=M(r,f,d,_,x[10],-42063,17);_=M(_,r,f,d,x[11],-1990404162,22)
  d=M(d,_,r,f,x[12],1804603682,7);f=M(f,d,_,r,x[13],-40341101,12);r=M(r,f,d,_,x[14],-1502002290,17);_=M(_,r,f,d,x[15],1236535329,22)
  d=T(d,_,r,f,x[1],-165796510,5);f=T(f,d,_,r,x[6],-1069501632,9);r=T(r,f,d,_,x[11],643717713,14);_=T(_,r,f,d,x[0],-373897302,20)
  d=T(d,_,r,f,x[5],-701558691,5);f=T(f,d,_,r,x[10],38016083,9);r=T(r,f,d,_,x[15],-660478335,14);_=T(_,r,f,d,x[4],-405537848,20)
  d=T(d,_,r,f,x[9],568446438,5);f=T(f,d,_,r,x[14],-1019803690,9);r=T(r,f,d,_,x[3],-187363961,14);_=T(_,r,f,d,x[8],1163531501,20)
  d=T(d,_,r,f,x[13],-1444681467,5);f=T(f,d,_,r,x[2],-51403784,9);r=T(r,f,d,_,x[7],1735328473,14);_=T(_,r,f,d,x[12],-1926607734,20)
  d=C(d,_,r,f,x[5],-378558,4);f=C(f,d,_,r,x[8],-2022574463,11);r=C(r,f,d,_,x[11],1839030562,16);_=C(_,r,f,d,x[14],-35309556,23)
  d=C(d,_,r,f,x[1],-1530992060,4);f=C(f,d,_,r,x[4],1272893353,11);r=C(r,f,d,_,x[7],-155497632,16);_=C(_,r,f,d,x[10],-1094730640,23)
  d=C(d,_,r,f,x[13],681279174,4);f=C(f,d,_,r,x[0],-358537222,11);r=C(r,f,d,_,x[3],-722521979,16);_=C(_,r,f,d,x[6],76029189,23)
  d=C(d,_,r,f,x[9],-640364487,4);f=C(f,d,_,r,x[12],-421815835,11);r=C(r,f,d,_,x[15],530742520,16);_=C(_,r,f,d,x[2],-995338651,23)
  d=S(d,_,r,f,x[0],-198630844,6);f=S(f,d,_,r,x[7],1126891415,10);r=S(r,f,d,_,x[14],-1416354905,15);_=S(_,r,f,d,x[5],-57434055,21)
  d=S(d,_,r,f,x[12],1700485571,6);f=S(f,d,_,r,x[3],-1894986606,10);r=S(r,f,d,_,x[10],-1051523,15);_=S(_,r,f,d,x[1],-2054922799,21)
  d=S(d,_,r,f,x[8],1873313359,6);f=S(f,d,_,r,x[15],-30611744,10);r=S(r,f,d,_,x[6],-1560198380,15);_=S(_,r,f,d,x[13],1309151649,21)
  d=S(d,_,r,f,x[4],-145523070,6);f=S(f,d,_,r,x[11],-1120210379,10);r=S(r,f,d,_,x[2],718787259,15);_=S(_,r,f,d,x[9],-343485551,21)
  a=[a[0]+d|0,a[1]+_|0,a[2]+r|0,a[3]+f|0]}
  return a.map(v=>[v&255,(v>>8)&255,(v>>16)&255,(v>>24)&255].map(b=>b.toString(16).padStart(2,'0')).join('')).join('')
}

async function sha(algo, buf) {
  const hash = await crypto.subtle.digest(algo, buf)
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

function md5Buf(buf) {
  const decoder = new TextDecoder('utf-8', { fatal: false })
  return md5(decoder.decode(buf))
}

const ALGOS = [
  { label: 'MD5', fn: (buf) => Promise.resolve(md5Buf(buf)) },
  { label: 'SHA-1', fn: (buf) => sha('SHA-1', buf) },
  { label: 'SHA-256', fn: (buf) => sha('SHA-256', buf) },
  { label: 'SHA-384', fn: (buf) => sha('SHA-384', buf) },
  { label: 'SHA-512', fn: (buf) => sha('SHA-512', buf) },
]

export default function HashTool() {
  const [input, setInput] = useState('')
  const [hashes, setHashes] = useState({})
  const [fileName, setFileName] = useState('')
  const [fileSize, setFileSize] = useState(0)
  const [source, setSource] = useState('text')
  const fileBufRef = useRef(null)

  const computeHashes = useCallback(async (buf) => {
    const results = await Promise.all(ALGOS.map(async (a) => [a.label, await a.fn(buf)]))
    setHashes(Object.fromEntries(results))
  }, [])

  useEffect(() => {
    if (source === 'text') {
      if (!input) { setHashes({}); return }
      const buf = new TextEncoder().encode(input)
      computeHashes(buf)
    }
  }, [input, source, computeHashes])

  const processFile = useCallback(async (file) => {
    if (!file) return
    setFileName(file.name)
    setFileSize(file.size)
    setSource('file')
    const buf = await file.arrayBuffer()
    fileBufRef.current = buf
    computeHashes(buf)
    toast.success(`Hashing ${file.name}`)
  }, [computeHashes])

  const clearFile = useCallback(() => {
    setFileName('')
    setFileSize(0)
    setSource('text')
    fileBufRef.current = null
    if (input) {
      computeHashes(new TextEncoder().encode(input))
    } else {
      setHashes({})
    }
  }, [input, computeHashes])

  const copyText = (t) => { navigator.clipboard.writeText(t); toast.success('Copied') }

  const formatBytes = (bytes) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1048576).toFixed(1)} MB`
  }

  return (
    <div>
      <ToolHeader toolId="hash" title="Hash Generator" description="Generate MD5, SHA-1, SHA-256, SHA-384, SHA-512 hashes" />

      <div className="forge-card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
          <div className="tab-pills">
            <button className={`tab-pill ${source === 'text' ? 'active' : ''}`} onClick={() => { setSource('text'); setFileName('') }}>Text</button>
            <button className={`tab-pill ${source === 'file' ? 'active' : ''}`} onClick={() => setSource('file')}>
              <Upload size={12} /> File
            </button>
          </div>
        </div>

        {source === 'text' ? (
          <DropZone
            compact
            accept="*"
            onFile={(file) => {
              file.text().then((text) => {
                setFileName('')
                setFileSize(0)
                fileBufRef.current = null
                setSource('text')
                setInput(text)
              })
            }}
          >
            <textarea
              value={input} onChange={(e) => setInput(e.target.value)}
              placeholder="Enter text to hash..."
              style={{
                width: '100%', minHeight: 120, background: 'var(--bg)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius)', padding: '14px 16px', color: 'var(--text)',
                fontFamily: 'var(--font-code)', fontSize: 13, resize: 'vertical', outline: 'none',
              }}
            />
            {input && <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-code)' }}>{input.length} characters &middot; {new TextEncoder().encode(input).length} bytes</div>}
          </DropZone>
        ) : fileName ? (
          <DropZone compact accept="*" onFile={processFile}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>{fileName}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-code)' }}>{formatBytes(fileSize)}</div>
              </div>
              <button type="button" onClick={clearFile} className="forge-btn" style={{ fontSize: 11 }}>Clear</button>
            </div>
          </DropZone>
        ) : (
          <DropZone
            accept="*"
            label="Drop a file to generate its hash"
            onFile={processFile}
          />
        )}
      </div>

      {Object.keys(hashes).length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {ALGOS.map((a) => (
            <div key={a.label} className="forge-card" style={{ padding: '14px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)', fontFamily: 'var(--font-ui)' }}>{a.label}</span>
                <button type="button" onClick={() => copyText(hashes[a.label])} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><Copy size={13} /></button>
              </div>
              <div style={{ fontSize: 12, fontFamily: 'var(--font-code)', color: 'var(--text)', wordBreak: 'break-all', lineHeight: 1.6 }}>{hashes[a.label] || '...'}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
