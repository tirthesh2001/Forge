export function hexToRgb(hex) {
  const h = hex.replace('#', '')
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16),
  }
}

export function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map((v) =>
    Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')
  ).join('').toUpperCase()
}

export function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return { h: 0, s: 0, l: Math.round(l * 100) }
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6
  else if (max === g) h = ((b - r) / d + 2) / 6
  else h = ((r - g) / d + 4) / 6
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) }
}

export function hslToRgb(h, s, l) {
  h /= 360; s /= 100; l /= 100
  if (s === 0) {
    const v = Math.round(l * 255)
    return { r: v, g: v, b: v }
  }
  const hue2rgb = (p, q, t) => {
    if (t < 0) t += 1
    if (t > 1) t -= 1
    if (t < 1 / 6) return p + (q - p) * 6 * t
    if (t < 1 / 2) return q
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
    return p
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  return {
    r: Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
    g: Math.round(hue2rgb(p, q, h) * 255),
    b: Math.round(hue2rgb(p, q, h - 1 / 3) * 255),
  }
}

export function rgbToHsv(r, g, b) {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  const v = max
  const d = max - min
  const s = max === 0 ? 0 : d / max
  let h
  if (max === min) h = 0
  else {
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6
    else if (max === g) h = ((b - r) / d + 2) / 6
    else h = ((r - g) / d + 4) / 6
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), v: Math.round(v * 100) }
}

export function hsvToRgb(h, s, v) {
  h /= 360; s /= 100; v /= 100
  const i = Math.floor(h * 6)
  const f = h * 6 - i
  const p = v * (1 - s)
  const q = v * (1 - f * s)
  const t = v * (1 - (1 - f) * s)
  let r, g, b
  switch (i % 6) {
    case 0: r = v; g = t; b = p; break
    case 1: r = q; g = v; b = p; break
    case 2: r = p; g = v; b = t; break
    case 3: r = p; g = q; b = v; break
    case 4: r = t; g = p; b = v; break
    case 5: r = v; g = p; b = q; break
  }
  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
  }
}

export function generateShades(hex, count) {
  const { r, g, b } = hexToRgb(hex)
  const shades = []
  for (let i = 1; i <= count; i++) {
    const factor = 1 - (i / (count + 1))
    shades.push(rgbToHex(
      Math.round(r * factor),
      Math.round(g * factor),
      Math.round(b * factor),
    ))
  }
  return shades
}

export function generateTints(hex, count) {
  const { r, g, b } = hexToRgb(hex)
  const tints = []
  for (let i = count; i >= 1; i--) {
    const factor = i / (count + 1)
    tints.push(rgbToHex(
      Math.round(r + (255 - r) * (1 - factor)),
      Math.round(g + (255 - g) * (1 - factor)),
      Math.round(b + (255 - b) * (1 - factor)),
    ))
  }
  return tints
}

function normalizeHue(h) {
  return ((h % 360) + 360) % 360
}

export function getComplementary(h, s, l) {
  return [
    { h: normalizeHue(h), s, l },
    { h: normalizeHue(h + 180), s, l },
  ]
}

export function getAnalogous(h, s, l) {
  return [
    { h: normalizeHue(h - 30), s, l },
    { h: normalizeHue(h - 15), s, l },
    { h: normalizeHue(h), s, l },
    { h: normalizeHue(h + 15), s, l },
    { h: normalizeHue(h + 30), s, l },
  ]
}

export function getTriadic(h, s, l) {
  return [
    { h: normalizeHue(h), s, l },
    { h: normalizeHue(h + 120), s, l },
    { h: normalizeHue(h + 240), s, l },
  ]
}

export function getSplitComplementary(h, s, l) {
  return [
    { h: normalizeHue(h), s, l },
    { h: normalizeHue(h + 150), s, l },
    { h: normalizeHue(h + 210), s, l },
  ]
}

export function hslToHex(h, s, l) {
  const { r, g, b } = hslToRgb(h, s, l)
  return rgbToHex(r, g, b)
}

export function formatCssVariables(colors) {
  const lines = colors.map((hex, i) => `  --palette-${i + 1}: ${hex};`)
  return `:root {\n${lines.join('\n')}\n}`
}

export function formatTailwindConfig(colors) {
  const entries = colors.map((hex, i) => `        '${i + 1}': '${hex}',`).join('\n')
  return `extend: {\n  colors: {\n    palette: {\n${entries}\n    },\n  },\n},`
}
