export function readAsText(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onerror = () => reject(new Error('Failed to read file'))
    r.onload = () => resolve(String(r.result || ''))
    r.readAsText(file)
  })
}

export function readAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onerror = () => reject(new Error('Failed to read file'))
    r.onload = () => resolve(r.result)
    r.readAsArrayBuffer(file)
  })
}

export function readAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onerror = () => reject(new Error('Failed to read file'))
    r.onload = () => resolve(String(r.result || ''))
    r.readAsDataURL(file)
  })
}

export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = src
  })
}

export function canvasToBlob(canvas, mime, quality) {
  return new Promise((resolve, reject) => {
    try {
      canvas.toBlob((blob) => {
        if (!blob) return reject(new Error('Canvas is too large for browser to encode. Try reducing dimensions.'))
        resolve(blob)
      }, mime, quality)
    } catch (err) {
      reject(err)
    }
  })
}

export function nameWithoutExt(name) {
  const idx = (name || '').lastIndexOf('.')
  return idx > 0 ? name.slice(0, idx) : (name || 'converted')
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function formatBytes(bytes) {
  if (!bytes && bytes !== 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  let i = 0
  let n = bytes
  while (n >= 1024 && i < units.length - 1) { n /= 1024; i++ }
  return `${n.toFixed(n >= 10 || i === 0 ? 0 : 1)} ${units[i]}`
}
