import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { Copy, AlertCircle, CheckCircle2, Lock, Unlock, ShieldCheck, Eye, EyeOff } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import useCloudState from '../../hooks/useCloudState'
import ToolHeader from '../../components/ToolHeader'
import { copyWithHistory } from '../../utils/copyWithHistory'

const ALGORITHMS = ['HS256', 'RS256', 'ES256']

const EXAMPLE_HEADER = { alg: 'HS256', typ: 'JWT' }
const EXAMPLE_PAYLOAD = {
  sub: '1234567890',
  name: 'John Doe',
  admin: true,
  iat: 1516239022,
}

function base64UrlEncode(str) {
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64UrlDecode(str) {
  let s = str.replace(/-/g, '+').replace(/_/g, '/')
  while (s.length % 4) s += '='
  return atob(s)
}

function decodeJwtParts(token) {
  const parts = token.split('.')
  if (parts.length !== 3) throw new Error('Invalid JWT: must have 3 parts separated by dots')
  try {
    const header = JSON.parse(base64UrlDecode(parts[0]))
    const payload = JSON.parse(base64UrlDecode(parts[1]))
    return { header, payload, signature: parts[2] }
  } catch {
    throw new Error('Invalid JWT: unable to decode Base64URL segments')
  }
}

async function hmacSign(data, secret) {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data))
  return btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

async function hmacVerify(token, secret) {
  const parts = token.split('.')
  if (parts.length !== 3) return false
  const data = parts[0] + '.' + parts[1]
  const expectedSig = await hmacSign(data, secret)
  return expectedSig === parts[2]
}

function pemToArrayBuffer(pem) {
  const lines = pem.split('\n').filter((l) => !l.startsWith('-----'))
  const b64 = lines.join('')
  const binary = atob(b64)
  const buf = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) buf[i] = binary.charCodeAt(i)
  return buf.buffer
}

async function rsaSign(data, privatePem) {
  const buf = pemToArrayBuffer(privatePem)
  const key = await crypto.subtle.importKey('pkcs8', buf, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(data))
  return btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

async function rsaVerify(token, publicPem) {
  const parts = token.split('.')
  if (parts.length !== 3) return false
  const data = parts[0] + '.' + parts[1]
  let sigStr = parts[2].replace(/-/g, '+').replace(/_/g, '/')
  while (sigStr.length % 4) sigStr += '='
  const sigBuf = Uint8Array.from(atob(sigStr), (c) => c.charCodeAt(0))
  const buf = pemToArrayBuffer(publicPem)
  const key = await crypto.subtle.importKey('spki', buf, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify'])
  return crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, sigBuf, new TextEncoder().encode(data))
}

async function ecSign(data, privatePem) {
  const buf = pemToArrayBuffer(privatePem)
  const key = await crypto.subtle.importKey('pkcs8', buf, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, new TextEncoder().encode(data))
  return btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

async function ecVerify(token, publicPem) {
  const parts = token.split('.')
  if (parts.length !== 3) return false
  const data = parts[0] + '.' + parts[1]
  let sigStr = parts[2].replace(/-/g, '+').replace(/_/g, '/')
  while (sigStr.length % 4) sigStr += '='
  const sigBuf = Uint8Array.from(atob(sigStr), (c) => c.charCodeAt(0))
  const buf = pemToArrayBuffer(publicPem)
  const key = await crypto.subtle.importKey('spki', buf, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify'])
  return crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, key, sigBuf, new TextEncoder().encode(data))
}

async function signJwt(data, secret, alg) {
  if (alg === 'RS256') return rsaSign(data, secret)
  if (alg === 'ES256') return ecSign(data, secret)
  return hmacSign(data, secret)
}

async function verifyJwt(token, secret, alg) {
  if (alg === 'RS256') return rsaVerify(token, secret)
  if (alg === 'ES256') return ecVerify(token, secret)
  return hmacVerify(token, secret)
}

const CLAIM_LABELS = {
  iss: 'Issuer',
  sub: 'Subject',
  aud: 'Audience',
  exp: 'Expiration Time',
  nbf: 'Not Before',
  iat: 'Issued At',
  jti: 'JWT ID',
  name: 'Name',
  admin: 'Admin',
  email: 'Email',
  role: 'Role',
  scope: 'Scope',
}

function formatTimestamp(val) {
  if (typeof val !== 'number') return null
  try {
    const d = new Date(val * 1000)
    if (isNaN(d.getTime())) return null
    return d.toLocaleString()
  } catch { return null }
}

function ClaimRow({ k, v }) {
  const label = CLAIM_LABELS[k]
  const isTime = ['exp', 'nbf', 'iat'].includes(k)
  const timeStr = isTime ? formatTimestamp(v) : null
  const isExpired = k === 'exp' && typeof v === 'number' && v * 1000 < Date.now()

  return (
    <div style={{
      display: 'flex',
      alignItems: 'baseline',
      gap: 10,
      padding: '6px 0',
      borderBottom: '1px solid var(--border)',
      fontSize: 13,
    }}>
      <span style={{ fontFamily: 'var(--font-code)', color: 'var(--accent)', minWidth: 50, flexShrink: 0 }}>{k}</span>
      {label && <span style={{ color: 'var(--text-muted)', fontSize: 11, flexShrink: 0 }}>({label})</span>}
      <span style={{ marginLeft: 'auto', textAlign: 'right', color: 'var(--text)', fontFamily: 'var(--font-code)', wordBreak: 'break-all' }}>
        {typeof v === 'boolean' ? (v ? 'true' : 'false') : String(v)}
        {timeStr && (
          <span style={{ display: 'block', fontSize: 11, color: isExpired ? '#EF4444' : 'var(--text-muted)', marginTop: 2 }}>
            {timeStr}{isExpired ? ' (expired)' : ''}
          </span>
        )}
      </span>
    </div>
  )
}

function copy(text) {
  copyWithHistory(text, 'Copied to clipboard')
}

export default function JWTTool() {
  const [tab, setTab] = useCloudState('jwt-tab', 'decode')

  return (
    <div>
      <ToolHeader toolId="jwt" title="JWT Tool" description="Decode, verify, and sign JSON Web Tokens">
        <div className="tab-pills">
          <button className={`tab-pill ${tab === 'decode' ? 'active' : ''}`} onClick={() => setTab('decode')}>
            <Unlock size={14} /> Decoder
          </button>
          <button className={`tab-pill ${tab === 'encode' ? 'active' : ''}`} onClick={() => setTab('encode')}>
            <Lock size={14} /> Encoder
          </button>
        </div>
      </ToolHeader>
      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.15 }}
        >
          {tab === 'decode' ? <DecoderPanel /> : <EncoderPanel />}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

function DecoderPanel() {
  const [token, setToken] = useCloudState('jwt-decode-token', '')
  const [lastOutput] = useCloudState('jwt-last-output', '')
  const [secret, setSecret] = useCloudState('jwt-decode-secret', '')
  const [showSecret, setShowSecret] = useState(false)
  const [verified, setVerified] = useState(null)

  // When jwt-last-output updates (e.g. after generate), fill decode input only if it is still empty — functional update avoids refilling after the user clears the field.
  useEffect(() => {
    const lo = String(lastOutput || '').trim()
    if (!lo) return
    setToken((prev) => (String(prev || '').trim() ? prev : lo))
  }, [lastOutput, setToken])

  const decoded = useMemo(() => {
    if (!token.trim()) return null
    try {
      return { ...decodeJwtParts(token.trim()), error: null }
    } catch (e) {
      return { header: null, payload: null, signature: null, error: e.message }
    }
  }, [token])

  const detectedAlg = decoded?.header?.alg || 'HS256'
  const isAsymmetric = detectedAlg === 'RS256' || detectedAlg === 'ES256'

  const verify = useCallback(async () => {
    if (!secret.trim() || !token.trim()) {
      toast.error(`Enter a token and ${isAsymmetric ? 'public key' : 'secret'}`)
      return
    }
    try {
      const ok = await verifyJwt(token.trim(), secret.trim(), detectedAlg)
      setVerified(ok)
      toast[ok ? 'success' : 'error'](ok ? 'Signature verified!' : 'Signature invalid')
    } catch (e) {
      setVerified(false)
      toast.error('Verification failed: ' + e.message)
    }
  }, [token, secret, detectedAlg, isAsymmetric])

  useEffect(() => { setVerified(null) }, [token, secret])

  const loadExample = () => {
    const h = base64UrlEncode(JSON.stringify(EXAMPLE_HEADER))
    const p = base64UrlEncode(JSON.stringify(EXAMPLE_PAYLOAD))
    hmacSign(`${h}.${p}`, 'your-256-bit-secret').then((sig) => {
      setToken(`${h}.${p}.${sig}`)
      setSecret('your-256-bit-secret')
    })
  }

  const inputStyle = {
    width: '100%',
    background: 'var(--bg)',
    color: 'var(--text)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    padding: '12px 14px',
    fontFamily: 'var(--font-code)',
    fontSize: 13,
    resize: 'none',
    outline: 'none',
    lineHeight: 1.6,
    transition: 'border-color 0.15s',
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: 16, alignItems: 'start' }}>
      {/* Left: Token input */}
      <div className="forge-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          borderBottom: '1px solid var(--border)',
        }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Encoded Token</span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="forge-btn" onClick={loadExample} style={{ fontSize: 11 }}>Load example</button>
            <button className="forge-btn" onClick={() => copy(token)} disabled={!token.trim()}><Copy size={12} /></button>
          </div>
        </div>
        <textarea
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="Paste a JWT here..."
          rows={8}
          style={{
            ...inputStyle,
            border: 'none',
            borderRadius: 0,
            padding: '16px',
            minHeight: 180,
          }}
          spellCheck={false}
        />

        {/* Verification */}
        <div style={{
          borderTop: '1px solid var(--border)',
          padding: '14px 16px',
        }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <ShieldCheck size={14} /> Signature Verification
            <span style={{ fontWeight: 400, opacity: 0.6 }}>({detectedAlg})</span>
          </div>
          {isAsymmetric ? (
            <div style={{ marginBottom: 8 }}>
              <textarea
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                placeholder={`Paste ${detectedAlg === 'RS256' ? 'RSA' : 'EC'} public key (PEM format)...`}
                rows={4}
                style={{ ...inputStyle, fontSize: 11, minHeight: 80 }}
              />
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <input
                  type={showSecret ? 'text' : 'password'}
                  value={secret}
                  onChange={(e) => setSecret(e.target.value)}
                  placeholder="Enter secret key..."
                  style={{ ...inputStyle, padding: '10px 36px 10px 12px', fontSize: 12 }}
                />
                <button
                  onClick={() => setShowSecret(!showSecret)}
                  style={{
                    position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 2,
                  }}
                >
                  {showSecret ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
          )}
          <button className="forge-btn forge-btn-primary" onClick={verify} style={{ fontSize: 12, padding: '10px 16px' }}>
            Verify
          </button>
          <AnimatePresence>
            {verified !== null && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                style={{
                  marginTop: 8,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  color: verified ? '#22C55E' : '#EF4444',
                }}
              >
                {verified ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                {verified ? 'Signature Verified' : 'Invalid Signature'}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {decoded?.error && (
          <div style={{
            borderTop: '1px solid var(--border)',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            color: '#EF4444',
            fontSize: 12,
          }}>
            <AlertCircle size={14} />
            {decoded.error}
          </div>
        )}
      </div>

      {/* Right: Decoded output */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <DecodedSection title="Header" data={decoded?.header} color="var(--accent)" />
        <DecodedSection title="Payload" data={decoded?.payload} color="var(--accent)" showClaims />
      </div>
    </div>
  )
}

function DecodedSection({ title, data, color, showClaims }) {
  const [view, setView] = useState('json')
  const json = data ? JSON.stringify(data, null, 2) : ''

  return (
    <div className="forge-card" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 16px',
        borderBottom: '1px solid var(--border)',
      }}>
        <span style={{ fontSize: 13, fontWeight: 600, color }}>Decoded {title}</span>
        <div style={{ display: 'flex', gap: 4 }}>
          {showClaims && (
            <div className="tab-pills" style={{ padding: 2 }}>
              <button
                className={`tab-pill ${view === 'json' ? 'active' : ''}`}
                onClick={() => setView('json')}
                style={{ fontSize: 11, padding: '4px 10px' }}
              >
                JSON
              </button>
              <button
                className={`tab-pill ${view === 'claims' ? 'active' : ''}`}
                onClick={() => setView('claims')}
                style={{ fontSize: 11, padding: '4px 10px' }}
              >
                Claims
              </button>
            </div>
          )}
          <button className="forge-btn" onClick={() => copy(json)} disabled={!json} style={{ padding: '4px 8px' }}>
            <Copy size={12} />
          </button>
        </div>
      </div>

      {!data ? (
        <div style={{
          padding: '32px 16px',
          textAlign: 'center',
          color: 'var(--text-muted)',
          fontSize: 13,
        }}>
          Paste a JWT to see the decoded {title.toLowerCase()}
        </div>
      ) : showClaims && view === 'claims' ? (
        <div style={{ padding: '8px 16px 12px' }}>
          {Object.entries(data).map(([k, v]) => (
            <ClaimRow key={k} k={k} v={v} />
          ))}
        </div>
      ) : (
        <pre
          style={{
            padding: '14px 16px',
            margin: 0,
            fontSize: 12,
            lineHeight: 1.7,
            color: 'var(--text)',
            fontFamily: 'var(--font-code)',
            overflowX: 'auto',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all',
          }}
        >
          {json}
        </pre>
      )}
    </div>
  )
}

function EncoderPanel() {
  const [decodeToken] = useCloudState('jwt-decode-token', '')
  const [alg, setAlg] = useState('HS256')
  const [headerStr, setHeaderStr] = useCloudState('jwt-enc-header', JSON.stringify(EXAMPLE_HEADER, null, 2))
  const [payloadStr, setPayloadStr] = useCloudState('jwt-enc-payload', JSON.stringify(EXAMPLE_PAYLOAD, null, 2))
  const [secret, setSecret] = useCloudState('jwt-enc-secret', 'your-256-bit-secret')
  const [showSecret, setShowSecret] = useState(false)
  const [output, setOutput] = useCloudState('jwt-last-output', '')
  const skipClearOutputOnMount = useRef(true)

  useEffect(() => {
    const t = String(decodeToken || '').trim()
    if (!t) return
    try {
      const { header, payload } = decodeJwtParts(t)
      setHeaderStr(JSON.stringify(header, null, 2))
      setPayloadStr(JSON.stringify(payload, null, 2))
      const a = header?.alg
      if (a && ALGORITHMS.includes(a)) setAlg(a)
    } catch { /* keep editor state */ }
  }, [decodeToken, setHeaderStr, setPayloadStr])

  const isAsymmetricEnc = alg === 'RS256' || alg === 'ES256'

  const changeAlg = useCallback((newAlg) => {
    setAlg(newAlg)
    try {
      const h = JSON.parse(headerStr)
      h.alg = newAlg
      setHeaderStr(JSON.stringify(h, null, 2))
    } catch { /* noop */ }
    if (newAlg !== 'HS256') setSecret('')
    setOutput('')
  }, [headerStr, setHeaderStr, setOutput])

  const headerParse = useMemo(() => {
    try {
      JSON.parse(headerStr)
      return { valid: true, error: null }
    } catch (e) {
      return { valid: false, error: e.message }
    }
  }, [headerStr])

  const payloadParse = useMemo(() => {
    try {
      JSON.parse(payloadStr)
      return { valid: true, error: null }
    } catch (e) {
      return { valid: false, error: e.message }
    }
  }, [payloadStr])

  const headerValid = headerParse.valid
  const payloadValid = payloadParse.valid
  const headerErr = headerParse.error
  const payloadErr = payloadParse.error

  const generate = useCallback(async () => {
    if (!headerValid || !payloadValid) {
      toast.error('Fix JSON errors first')
      return
    }
    if (!secret.trim()) {
      toast.error(`Enter a ${isAsymmetricEnc ? 'private key' : 'secret'}`)
      return
    }
    try {
      const h = base64UrlEncode(JSON.stringify(JSON.parse(headerStr)))
      const p = base64UrlEncode(JSON.stringify(JSON.parse(payloadStr)))
      const sig = await signJwt(`${h}.${p}`, secret, alg)
      setOutput(`${h}.${p}.${sig}`)
      toast.success('JWT generated!')
    } catch (e) {
      toast.error('Signing failed: ' + e.message)
    }
  }, [headerStr, payloadStr, secret, headerValid, payloadValid, alg, isAsymmetricEnc, setOutput])

  useEffect(() => {
    if (skipClearOutputOnMount.current) {
      skipClearOutputOnMount.current = false
      return
    }
    setOutput('')
  }, [headerStr, payloadStr, secret, setOutput])

  const addTimeClaim = (claim) => {
    try {
      const obj = JSON.parse(payloadStr)
      obj[claim] = Math.floor(Date.now() / 1000) + (claim === 'exp' ? 3600 : 0)
      setPayloadStr(JSON.stringify(obj, null, 2))
    } catch { /* noop */ }
  }

  const textAreaStyle = {
    width: '100%',
    background: 'var(--bg)',
    color: 'var(--text)',
    border: 'none',
    fontFamily: 'var(--font-code)',
    fontSize: 12,
    lineHeight: 1.7,
    resize: 'none',
    outline: 'none',
    padding: '14px 16px',
    minHeight: 120,
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'start' }}>
      {/* Left: Header + Payload inputs */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Header editor */}
        <div className="forge-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 16px',
            borderBottom: '1px solid var(--border)',
          }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)' }}>Header</span>
            <span style={{
              fontSize: 11,
              fontWeight: 500,
              color: headerValid ? '#22C55E' : '#EF4444',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}>
              {headerValid ? <><CheckCircle2 size={12} /> Valid</> : <><AlertCircle size={12} /> Invalid</>}
            </span>
          </div>
          <textarea
            value={headerStr}
            onChange={(e) => setHeaderStr(e.target.value)}
            style={textAreaStyle}
            rows={4}
            spellCheck={false}
          />
          {headerErr && (
            <div style={{
              borderTop: '1px solid var(--border)',
              padding: '8px 16px',
              fontSize: 11,
              color: '#EF4444',
              fontFamily: 'var(--font-code)',
            }}>
              {headerErr}
            </div>
          )}
        </div>

        {/* Payload editor */}
        <div className="forge-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 16px',
            borderBottom: '1px solid var(--border)',
          }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)' }}>Payload</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button
                className="forge-btn"
                onClick={() => addTimeClaim('iat')}
                style={{ fontSize: 10, padding: '3px 8px' }}
                title="Add issued-at claim with current timestamp"
              >
                + iat
              </button>
              <button
                className="forge-btn"
                onClick={() => addTimeClaim('exp')}
                style={{ fontSize: 10, padding: '3px 8px' }}
                title="Add expiration claim (1 hour from now)"
              >
                + exp
              </button>
              <span style={{
                fontSize: 11,
                fontWeight: 500,
                color: payloadValid ? '#22C55E' : '#EF4444',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}>
                {payloadValid ? <><CheckCircle2 size={12} /> Valid</> : <><AlertCircle size={12} /> Invalid</>}
              </span>
            </div>
          </div>
          <textarea
            value={payloadStr}
            onChange={(e) => setPayloadStr(e.target.value)}
            style={{ ...textAreaStyle, minHeight: 180 }}
            rows={8}
            spellCheck={false}
          />
          {payloadErr && (
            <div style={{
              borderTop: '1px solid var(--border)',
              padding: '8px 16px',
              fontSize: 11,
              color: '#EF4444',
              fontFamily: 'var(--font-code)',
            }}>
              {payloadErr}
            </div>
          )}
        </div>
      </div>

      {/* Right: Secret + Output */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Secret */}
        <div className="forge-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{
            padding: '10px 16px',
            borderBottom: '1px solid var(--border)',
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--text)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <ShieldCheck size={14} /> {isAsymmetricEnc ? 'Private Key' : 'Signing Secret'}
            </div>
            <div style={{ display: 'flex', gap: 3 }}>
              {ALGORITHMS.map((a) => (
                <button key={a} onClick={() => changeAlg(a)}
                  style={{
                    padding: '3px 8px', fontSize: 10, borderRadius: 4, cursor: 'pointer', fontFamily: 'var(--font-code)',
                    border: a === alg ? '1px solid var(--accent)' : '1px solid var(--border)',
                    background: a === alg ? 'color-mix(in srgb, var(--accent) 12%, transparent)' : 'transparent',
                    color: a === alg ? 'var(--accent)' : 'var(--text-muted)',
                  }}>{a}</button>
              ))}
            </div>
          </div>
          <div style={{ padding: '14px 16px' }}>
            {isAsymmetricEnc ? (
              <textarea
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                placeholder={`Paste ${alg === 'RS256' ? 'RSA' : 'EC P-256'} private key (PKCS8 PEM format)...`}
                rows={5}
                style={{
                  width: '100%', background: 'var(--bg)', color: 'var(--text)',
                  border: '1px solid var(--border)', borderRadius: 'var(--radius)',
                  padding: '10px 12px', fontFamily: 'var(--font-code)', fontSize: 11,
                  resize: 'vertical', outline: 'none',
                }}
              />
            ) : (
              <div style={{ position: 'relative' }}>
                <input
                  type={showSecret ? 'text' : 'password'}
                  value={secret}
                  onChange={(e) => setSecret(e.target.value)}
                  placeholder="Secret key..."
                  style={{
                    width: '100%', background: 'var(--bg)', color: 'var(--text)',
                    border: '1px solid var(--border)', borderRadius: 'var(--radius)',
                    padding: '10px 36px 10px 12px', fontFamily: 'var(--font-code)', fontSize: 12, outline: 'none',
                  }}
                />
                <button
                  onClick={() => setShowSecret(!showSecret)}
                  style={{
                    position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 2,
                  }}
                >
                  {showSecret ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            )}
          </div>
          <div style={{ padding: '0 16px 14px' }}>
            <button
              className="forge-btn forge-btn-primary"
              onClick={generate}
              style={{ width: '100%', justifyContent: 'center', padding: '10px 0', fontSize: 13 }}
            >
              <Lock size={14} /> Generate JWT
            </button>
          </div>
        </div>

        {/* Output */}
        <div className="forge-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 16px',
            borderBottom: '1px solid var(--border)',
          }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Generated Token</span>
            <button className="forge-btn" onClick={() => copy(output)} disabled={!output} style={{ padding: '4px 8px' }}>
              <Copy size={12} />
            </button>
          </div>
          {output ? (
            <pre style={{
              padding: '16px',
              margin: 0,
              fontFamily: 'var(--font-code)',
              fontSize: 12,
              lineHeight: 1.7,
              color: 'var(--text)',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
              minHeight: 100,
            }}>
              {output}
            </pre>
          ) : (
            <div style={{
              padding: '40px 16px',
              textAlign: 'center',
              color: 'var(--text-muted)',
              fontSize: 13,
            }}>
              Configure header, payload, and secret, then click Generate
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
