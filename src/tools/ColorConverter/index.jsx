import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Copy, Bookmark, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import {
  hexToRgb, rgbToHex, rgbToHsl, hslToRgb,
  rgbToHsv, hsvToRgb, generateShades, generateTints,
  getComplementary, getAnalogous, getTriadic, getSplitComplementary,
  hslToHex, formatCssVariables, formatTailwindConfig,
} from '../../utils/colorUtils'
import useCloudState from '../../hooks/useCloudState'
import ToolHeader from '../../components/ToolHeader'
import { copyWithHistory } from '../../utils/copyWithHistory'

function isValidHex(h) { return /^#[0-9A-Fa-f]{6}$/.test(h) }
function clamp(v, min, max) { return Math.max(min, Math.min(max, Math.round(Number(v) || 0))) }

export default function ColorConverter() {
  const [hex, setHex] = useCloudState('color-hex', '#00D4FF')
  const [rgb, setRgb] = useState({ r: 0, g: 212, b: 255 })
  const [hsl, setHsl] = useState(() => rgbToHsl(0, 212, 255))
  const [hsv, setHsv] = useState(() => rgbToHsv(0, 212, 255))

  useEffect(() => {
    if (isValidHex(hex)) {
      const { r, g, b } = hexToRgb(hex)
      setRgb({ r, g, b })
      setHsl(rgbToHsl(r, g, b))
      setHsv(rgbToHsv(r, g, b))
    }
  }, [])
  const [recent, setRecent] = useCloudState('recent-colors', [])
  const [savedColors, setSavedColors] = useCloudState('color-saved', [])
  const [saveName, setSaveName] = useState('')
  const [harmonyTab, setHarmonyTab] = useState('complementary')
  const savedColorsScrollRef = useRef(null)
  const savedColorRowH = 58
  const savedColorsVirtualizer = useVirtualizer({
    count: savedColors.length,
    getScrollElement: () => savedColorsScrollRef.current,
    estimateSize: () => savedColorRowH,
    overscan: 10,
  })

  const syncFromRgb = useCallback((r, g, b) => {
    r = clamp(r, 0, 255); g = clamp(g, 0, 255); b = clamp(b, 0, 255)
    setRgb({ r, g, b }); setHex(rgbToHex(r, g, b)); setHsl(rgbToHsl(r, g, b)); setHsv(rgbToHsv(r, g, b))
  }, [])

  const handleHexChange = useCallback((value) => {
    setHex(value)
    if (isValidHex(value)) { const { r, g, b } = hexToRgb(value); setRgb({ r, g, b }); setHsl(rgbToHsl(r, g, b)); setHsv(rgbToHsv(r, g, b)) }
  }, [])

  const handlePickerChange = useCallback((e) => { handleHexChange(e.target.value.toUpperCase()) }, [handleHexChange])

  const handleRgbChange = useCallback((ch, val) => { const next = { ...rgb, [ch]: clamp(val, 0, 255) }; syncFromRgb(next.r, next.g, next.b) }, [rgb, syncFromRgb])

  const handleHslChange = useCallback((ch, val) => {
    const next = { ...hsl }; next[ch] = clamp(val, 0, ch === 'h' ? 360 : 100); setHsl(next)
    const { r, g, b } = hslToRgb(next.h, next.s, next.l); setRgb({ r, g, b }); setHex(rgbToHex(r, g, b)); setHsv(rgbToHsv(r, g, b))
  }, [hsl])

  const handleHsvChange = useCallback((ch, val) => {
    const next = { ...hsv }; next[ch] = clamp(val, 0, ch === 'h' ? 360 : 100); setHsv(next)
    const { r, g, b } = hsvToRgb(next.h, next.s, next.v); setRgb({ r, g, b }); setHex(rgbToHex(r, g, b)); setHsl(rgbToHsl(r, g, b))
  }, [hsv])

  const selectColor = useCallback((h) => { handleHexChange(h) }, [handleHexChange])

  useEffect(() => {
    if (isValidHex(hex)) {
      setRecent((prev) => [hex, ...prev.filter((c) => c !== hex)].slice(0, 10))
    }
  }, [hex])

  const copyText = useCallback((text) => { copyWithHistory(text) }, [])

  const saveColor = useCallback(() => {
    if (!isValidHex(hex)) return
    const entry = {
      id: Date.now().toString(36),
      hex,
      name: saveName.trim() || hex,
      rgb: `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`,
      hsl: `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`,
      savedAt: new Date().toISOString(),
    }
    setSavedColors((prev) => [entry, ...prev.filter((c) => c.hex !== hex)])
    setSaveName('')
    toast.success('Color saved')
  }, [hex, rgb, hsl, saveName])

  const deleteSavedColor = useCallback((id) => {
    setSavedColors((prev) => prev.filter((c) => c.id !== id))
    toast.success('Removed')
  }, [])

  const tints = isValidHex(hex) ? generateTints(hex, 5) : []
  const shades = isValidHex(hex) ? generateShades(hex, 5) : []

  const harmonyHexes = useMemo(() => {
    if (!isValidHex(hex)) return []
    const { h, s, l } = hsl
    let hslColors
    switch (harmonyTab) {
      case 'analogous': hslColors = getAnalogous(h, s, l); break
      case 'triadic': hslColors = getTriadic(h, s, l); break
      case 'split': hslColors = getSplitComplementary(h, s, l); break
      default: hslColors = getComplementary(h, s, l)
    }
    return hslColors.map((c) => hslToHex(c.h, c.s, c.l))
  }, [hex, hsl.h, hsl.s, hsl.l, harmonyTab])

  const inputStyle = {
    background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius)',
    padding: '8px 12px', color: 'var(--text)', fontFamily: 'var(--font-code)', fontSize: 13, outline: 'none', width: '100%',
  }

  return (
    <div>
      <ToolHeader toolId="color" title="Color Converter" description="Convert between HEX, RGB, HSL, and HSV" />

      {/* Swatch + Save */}
      <div className="forge-card flex flex-col items-center gap-4 mb-5" style={{ padding: '32px 24px' }}>
        <div className="relative" style={{ width: 180, height: 180 }}>
          <div className="w-full h-full" style={{
            background: hex, borderRadius: 16,
            boxShadow: `0 0 50px ${hex}30, 0 0 20px ${hex}15`,
            transition: 'background 0.15s, box-shadow 0.15s',
          }} />
          <input
            type="color" value={isValidHex(hex) ? hex : '#000000'}
            onChange={handlePickerChange}
            className="absolute inset-0 w-full h-full cursor-pointer" style={{ opacity: 0 }}
          />
        </div>
        <span className="text-sm font-medium" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-code)' }}>{hex}</span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
            placeholder="Name (optional)"
            onKeyDown={(e) => e.key === 'Enter' && saveColor()}
            style={{
              background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius)',
              padding: '6px 12px', color: 'var(--text)', fontSize: 12, outline: 'none', width: 160,
              fontFamily: 'var(--font-ui)',
            }}
          />
          <button onClick={saveColor} className="forge-btn" style={{ padding: '6px 12px', fontSize: 12 }}>
            <Bookmark size={13} /> Save
          </button>
        </div>
      </div>

      {/* Input groups */}
      <div className="grid grid-cols-2 gap-4 mb-5">
        <ColorGroup label="HEX" copyValue={hex} onCopy={copyText}>
          <input value={hex} onChange={(e) => handleHexChange(e.target.value.toUpperCase())} style={inputStyle} maxLength={7} />
        </ColorGroup>

        <ColorGroup label="RGB" copyValue={`rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`} onCopy={copyText}>
          <div className="flex gap-2">
            {['r', 'g', 'b'].map((ch) => (
              <div key={ch} className="flex-1">
                <span className="text-xs block mb-1" style={{ color: 'var(--text-muted)', textTransform: 'uppercase' }}>{ch}</span>
                <input type="number" min={0} max={255} value={rgb[ch]} onChange={(e) => handleRgbChange(ch, e.target.value)} style={inputStyle} />
              </div>
            ))}
          </div>
        </ColorGroup>

        <ColorGroup label="HSL" copyValue={`hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`} onCopy={copyText}>
          <div className="flex gap-2">
            {[{ ch: 'h', label: 'H', max: 360 }, { ch: 's', label: 'S', max: 100 }, { ch: 'l', label: 'L', max: 100 }].map(({ ch, label, max }) => (
              <div key={ch} className="flex-1">
                <span className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>{label}</span>
                <input type="number" min={0} max={max} value={hsl[ch]} onChange={(e) => handleHslChange(ch, e.target.value)} style={inputStyle} />
              </div>
            ))}
          </div>
        </ColorGroup>

        <ColorGroup label="HSV" copyValue={`hsv(${hsv.h}, ${hsv.s}%, ${hsv.v}%)`} onCopy={copyText}>
          <div className="flex gap-2">
            {[{ ch: 'h', label: 'H', max: 360 }, { ch: 's', label: 'S', max: 100 }, { ch: 'v', label: 'V', max: 100 }].map(({ ch, label, max }) => (
              <div key={ch} className="flex-1">
                <span className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>{label}</span>
                <input type="number" min={0} max={max} value={hsv[ch]} onChange={(e) => handleHsvChange(ch, e.target.value)} style={inputStyle} />
              </div>
            ))}
          </div>
        </ColorGroup>
      </div>

      {/* Saved Colors */}
      {savedColors.length > 0 && (
        <div className="forge-card mb-5">
          <div className="text-xs font-semibold mb-4" style={{ color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Saved Colors
          </div>
          <div ref={savedColorsScrollRef} style={{ maxHeight: 320, overflow: 'auto' }}>
            <div style={{ height: savedColorsVirtualizer.getTotalSize(), position: 'relative', width: '100%' }}>
              {savedColorsVirtualizer.getVirtualItems().map((vi) => {
                const c = savedColors[vi.index]
                return (
                  <div
                    key={c.id}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectColor(c.hex) } }}
                    onClick={() => selectColor(c.hex)}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: vi.size,
                      transform: `translateY(${vi.start}px)`,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '8px 12px',
                      boxSizing: 'border-box',
                      background: 'var(--bg)',
                      borderRadius: 'var(--radius)',
                      border: '1px solid var(--border)',
                      cursor: 'pointer',
                      transition: 'border-color 0.15s',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)' }}
                  >
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%', background: c.hex,
                      border: '2px solid var(--border)', flexShrink: 0,
                    }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {c.name}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-code)' }}>
                        {c.rgb} &middot; {c.hsl}
                      </div>
                    </div>
                    <button type="button" onClick={(e) => { e.stopPropagation(); copyText(c.hex) }} className="forge-btn" style={{ padding: '4px 8px' }} title="Copy hex">
                      <Copy size={11} />
                    </button>
                    <button type="button" onClick={(e) => { e.stopPropagation(); deleteSavedColor(c.id) }} style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', padding: 4 }} title="Delete">
                      <Trash2 size={13} />
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Palette */}
      <div className="forge-card mb-5">
        <div className="text-xs font-semibold mb-4" style={{ color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Palette
        </div>
        <div className="flex items-center justify-center gap-2">
          {tints.map((c, i) => (
            <button key={`t${i}`} onClick={() => selectColor(c)} className="cursor-pointer transition-transform duration-100 hover:scale-110 group relative"
              style={{ width: 40, height: 40, borderRadius: 8, background: c, border: '1px solid var(--border)' }} title={c}>
            </button>
          ))}
          <div style={{ width: 52, height: 52, borderRadius: 10, background: hex, border: '2px solid var(--accent)', boxShadow: `0 0 14px ${hex}30` }} title={hex} />
          {shades.map((c, i) => (
            <button key={`s${i}`} onClick={() => selectColor(c)} className="cursor-pointer transition-transform duration-100 hover:scale-110"
              style={{ width: 40, height: 40, borderRadius: 8, background: c, border: '1px solid var(--border)' }} title={c}>
            </button>
          ))}
        </div>
      </div>

      {/* Palettes (harmonies) */}
      <div className="forge-card mb-5">
        <div className="text-xs font-semibold mb-4" style={{ color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Palettes
        </div>
        <div className="tab-pills" style={{ marginBottom: 16, flexWrap: 'wrap' }}>
          <button type="button" className={`tab-pill ${harmonyTab === 'complementary' ? 'active' : ''}`} onClick={() => setHarmonyTab('complementary')}>
            Complementary
          </button>
          <button type="button" className={`tab-pill ${harmonyTab === 'analogous' ? 'active' : ''}`} onClick={() => setHarmonyTab('analogous')}>
            Analogous
          </button>
          <button type="button" className={`tab-pill ${harmonyTab === 'triadic' ? 'active' : ''}`} onClick={() => setHarmonyTab('triadic')}>
            Triadic
          </button>
          <button type="button" className={`tab-pill ${harmonyTab === 'split' ? 'active' : ''}`} onClick={() => setHarmonyTab('split')}>
            Split-Complementary
          </button>
        </div>
        {isValidHex(hex) ? (
          <>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
              {harmonyHexes.map((c, i) => (
                <div
                  key={`${harmonyTab}-${i}`}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                    minWidth: 72,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => selectColor(c)}
                    className="cursor-pointer transition-transform duration-100 hover:scale-105"
                    style={{
                      width: 56, height: 56, borderRadius: 10, background: c,
                      border: '1px solid var(--border)', boxShadow: `0 0 12px ${c}25`,
                    }}
                    title={`Apply ${c}`}
                  />
                  <span style={{ fontSize: 11, fontFamily: 'var(--font-code)', color: 'var(--text-muted)' }}>{c}</span>
                  <button type="button" onClick={() => copyText(c)} className="forge-btn" style={{ padding: '4px 8px', fontSize: 11 }}>
                    <Copy size={11} /> Copy
                  </button>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <button
                type="button"
                className="forge-btn"
                style={{ padding: '8px 14px', fontSize: 12 }}
                onClick={() => {
                  copyWithHistory(formatCssVariables(harmonyHexes), 'CSS variables copied')
                }}
              >
                Copy as CSS Variables
              </button>
              <button
                type="button"
                className="forge-btn"
                style={{ padding: '8px 14px', fontSize: 12 }}
                onClick={() => {
                  copyWithHistory(formatTailwindConfig(harmonyHexes), 'Tailwind config copied')
                }}
              >
                Copy as Tailwind Config
              </button>
            </div>
          </>
        ) : (
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Enter a valid hex color to see harmony palettes.</p>
        )}
      </div>

      {/* Recent colors */}
      {recent.length > 0 && (
        <div className="forge-card">
          <div className="text-xs font-semibold mb-4" style={{ color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Recently Used
          </div>
          <div className="flex flex-wrap gap-2.5">
            {recent.map((c, i) => (
              <button key={i} onClick={() => selectColor(c)}
                className="cursor-pointer transition-transform duration-100 hover:scale-110"
                style={{ width: 34, height: 34, borderRadius: '50%', background: c, border: '2px solid var(--border)' }} title={c} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function ColorGroup({ label, copyValue, onCopy, children }) {
  return (
    <div className="forge-card" style={{ padding: 16 }}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
        <button onClick={() => onCopy(copyValue)} className="cursor-pointer transition-colors duration-150"
          style={{ background: 'none', border: 'none', color: 'var(--text-muted)' }}
          onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent)'}
          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}>
          <Copy size={13} />
        </button>
      </div>
      {children}
    </div>
  )
}
