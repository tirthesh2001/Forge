// Client-side file conversion engine.
// Each converter is a function: async (file, opts) => { blob, filename, mime }
// Heavy libraries are dynamically imported on demand so they don't bloat the main bundle.

import { FORMAT_MIMES, detectFormat } from '../constants'
import { readAsText, readAsArrayBuffer, readAsDataURL, loadImage, canvasToBlob, nameWithoutExt } from './fileIO'

// ----- CSV / TSV parser (tiny, dependency-free) ------------------------------

function parseDelimited(text, delim) {
  const rows = []
  let row = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { cur += '"'; i++ }
        else inQuotes = false
      } else cur += c
    } else {
      if (c === '"') inQuotes = true
      else if (c === delim) { row.push(cur); cur = '' }
      else if (c === '\n') { row.push(cur); rows.push(row); row = []; cur = '' }
      else if (c === '\r') { /* skip */ }
      else cur += c
    }
  }
  if (cur.length > 0 || row.length > 0) { row.push(cur); rows.push(row) }
  return rows
}

function stringifyDelimited(rows, delim) {
  return rows.map((r) => r.map((v) => {
    const s = String(v ?? '')
    if (s.includes(delim) || s.includes('"') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`
    return s
  }).join(delim)).join('\n')
}

function rowsToObjects(rows) {
  if (rows.length === 0) return []
  const headers = rows[0]
  return rows.slice(1).map((r) => {
    const obj = {}
    headers.forEach((h, i) => { obj[h] = r[i] ?? '' })
    return obj
  })
}

function objectsToRows(objects) {
  if (!Array.isArray(objects) || objects.length === 0) return []
  const headers = Array.from(new Set(objects.flatMap((o) => Object.keys(o || {}))))
  const rows = [headers]
  objects.forEach((o) => rows.push(headers.map((h) => {
    const v = o?.[h]
    if (v == null) return ''
    return typeof v === 'object' ? JSON.stringify(v) : String(v)
  })))
  return rows
}

// ----- XML helpers -----------------------------------------------------------

function xmlToJs(node) {
  if (node.nodeType === 3) return node.nodeValue
  const obj = {}
  if (node.attributes?.length) {
    obj['@attributes'] = {}
    for (const a of node.attributes) obj['@attributes'][a.name] = a.value
  }
  for (const child of node.childNodes) {
    if (child.nodeType === 3) {
      const text = child.nodeValue?.trim()
      if (text) obj['#text'] = (obj['#text'] || '') + text
    } else if (child.nodeType === 1) {
      const val = xmlToJs(child)
      if (obj[child.nodeName] === undefined) obj[child.nodeName] = val
      else {
        if (!Array.isArray(obj[child.nodeName])) obj[child.nodeName] = [obj[child.nodeName]]
        obj[child.nodeName].push(val)
      }
    }
  }
  return obj
}

function parseXmlDoc(text) {
  const parser = new DOMParser()
  const doc = parser.parseFromString(text, 'application/xml')
  const err = doc.querySelector('parsererror')
  if (err) throw new Error('Invalid XML: ' + err.textContent.split('\n')[0])
  return doc
}

function escapeXml(s) {
  return s.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]))
}

function jsToXml(obj, rootName = 'root') {
  function build(name, val) {
    if (val == null) return `<${name}/>`
    if (typeof val !== 'object') return `<${name}>${escapeXml(String(val))}</${name}>`
    if (Array.isArray(val)) return val.map((v) => build(name, v)).join('')
    let attrs = ''
    let inner = ''
    for (const [k, v] of Object.entries(val)) {
      if (k === '@attributes' && v && typeof v === 'object') {
        for (const [ak, av] of Object.entries(v)) attrs += ` ${ak}="${escapeXml(String(av))}"`
      } else if (k === '#text') {
        inner += escapeXml(String(v))
      } else {
        inner += build(k, v)
      }
    }
    return `<${name}${attrs}>${inner}</${name}>`
  }
  return `<?xml version="1.0" encoding="UTF-8"?>\n${build(rootName, obj)}`
}

// ----- Image conversions -----------------------------------------------------

async function imageToImage(file, targetFmt, opts = {}) {
  const dataUrl = await readAsDataURL(file)
  const img = await loadImage(dataUrl)
  const canvas = document.createElement('canvas')
  canvas.width = img.naturalWidth
  canvas.height = img.naturalHeight
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D context unavailable')
  if (targetFmt === 'jpeg' || targetFmt === 'bmp') {
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }
  ctx.drawImage(img, 0, 0)
  const mime = FORMAT_MIMES[targetFmt] || 'image/png'
  const quality = typeof opts.quality === 'number' ? opts.quality : 0.92
  const blob = await canvasToBlob(canvas, mime, quality)
  return { blob, filename: `${nameWithoutExt(file.name)}.${targetFmt === 'jpeg' ? 'jpg' : targetFmt}`, mime }
}

async function imageToPdf(file) {
  const { PDFDocument } = await import('pdf-lib')
  const bytes = new Uint8Array(await readAsArrayBuffer(file))
  const pdf = await PDFDocument.create()
  let embedded
  const fmt = detectFormat(file)
  if (fmt === 'jpeg') embedded = await pdf.embedJpg(bytes)
  else if (fmt === 'png') embedded = await pdf.embedPng(bytes)
  else {
    const pngBlob = (await imageToImage(file, 'png')).blob
    embedded = await pdf.embedPng(new Uint8Array(await pngBlob.arrayBuffer()))
  }
  const page = pdf.addPage([embedded.width, embedded.height])
  page.drawImage(embedded, { x: 0, y: 0, width: embedded.width, height: embedded.height })
  const out = await pdf.save()
  return { blob: new Blob([out], { type: 'application/pdf' }), filename: `${nameWithoutExt(file.name)}.pdf`, mime: 'application/pdf' }
}

// ----- PDF -------------------------------------------------------------------

async function loadPdfJs() {
  const pdfjs = await import('pdfjs-dist')
  try {
    const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url')
    pdfjs.GlobalWorkerOptions.workerSrc = worker.default
  } catch {
    pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`
  }
  return pdfjs
}

async function pdfToImages(file, targetFmt, opts = {}) {
  const pdfjs = await loadPdfJs()
  const data = new Uint8Array(await readAsArrayBuffer(file))
  const doc = await pdfjs.getDocument({ data }).promise
  const mime = FORMAT_MIMES[targetFmt] || 'image/png'
  const scale = opts.scale || 2
  const pages = []
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i)
    const viewport = page.getViewport({ scale })
    const canvas = document.createElement('canvas')
    canvas.width = viewport.width
    canvas.height = viewport.height
    const ctx = canvas.getContext('2d')
    await page.render({ canvasContext: ctx, viewport, canvas }).promise
    const blob = await canvasToBlob(canvas, mime, 0.92)
    pages.push(blob)
  }
  if (pages.length === 1) {
    return { blob: pages[0], filename: `${nameWithoutExt(file.name)}.${targetFmt === 'jpeg' ? 'jpg' : targetFmt}`, mime }
  }
  throw new Error(`PDF has ${pages.length} pages. Converting multi-page PDFs to images is limited — try the Server Conversion option.`)
}

async function pdfToText(file) {
  const pdfjs = await loadPdfJs()
  const data = new Uint8Array(await readAsArrayBuffer(file))
  const doc = await pdfjs.getDocument({ data }).promise
  const parts = []
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i)
    const content = await page.getTextContent()
    parts.push(content.items.map((it) => it.str).join(' '))
  }
  const text = parts.join('\n\n')
  return { blob: new Blob([text], { type: 'text/plain' }), filename: `${nameWithoutExt(file.name)}.txt`, mime: 'text/plain' }
}

// ----- DOCX ------------------------------------------------------------------

async function docxToHtml(file) {
  const mammoth = await import('mammoth/mammoth.browser')
  const buf = await readAsArrayBuffer(file)
  const result = await mammoth.convertToHtml({ arrayBuffer: buf })
  const html = `<!doctype html>\n<html><head><meta charset="utf-8"><title>${nameWithoutExt(file.name)}</title></head><body>${result.value}</body></html>`
  return { blob: new Blob([html], { type: 'text/html' }), filename: `${nameWithoutExt(file.name)}.html`, mime: 'text/html' }
}

async function docxToText(file) {
  const mammoth = await import('mammoth/mammoth.browser')
  const buf = await readAsArrayBuffer(file)
  const result = await mammoth.extractRawText({ arrayBuffer: buf })
  return { blob: new Blob([result.value], { type: 'text/plain' }), filename: `${nameWithoutExt(file.name)}.txt`, mime: 'text/plain' }
}

async function docxToMarkdown(file) {
  const mammoth = await import('mammoth/mammoth.browser')
  const buf = await readAsArrayBuffer(file)
  const html = await mammoth.convertToHtml({ arrayBuffer: buf })
  const md = htmlToMarkdown(html.value)
  return { blob: new Blob([md], { type: 'text/markdown' }), filename: `${nameWithoutExt(file.name)}.md`, mime: 'text/markdown' }
}

// ----- Data format conversions -----------------------------------------------

function textToBlob(text, fmt, file) {
  return { blob: new Blob([text], { type: FORMAT_MIMES[fmt] || 'text/plain' }), filename: `${nameWithoutExt(file.name)}.${fmt}`, mime: FORMAT_MIMES[fmt] || 'text/plain' }
}

async function jsonToCsv(file) {
  const text = await readAsText(file)
  const data = JSON.parse(text)
  const arr = Array.isArray(data) ? data : [data]
  return textToBlob(stringifyDelimited(objectsToRows(arr), ','), 'csv', file)
}

async function jsonToTsv(file) {
  const text = await readAsText(file)
  const data = JSON.parse(text)
  const arr = Array.isArray(data) ? data : [data]
  return textToBlob(stringifyDelimited(objectsToRows(arr), '\t'), 'tsv', file)
}

async function jsonToXml(file) {
  const text = await readAsText(file)
  const data = JSON.parse(text)
  return textToBlob(jsToXml(data, 'root'), 'xml', file)
}

async function jsonToYaml(file) {
  const YAML = await import('js-yaml')
  const text = await readAsText(file)
  const data = JSON.parse(text)
  return textToBlob(YAML.dump(data, { indent: 2, lineWidth: 120 }), 'yaml', file)
}

async function jsonToToml(file) {
  const toml = await import('smol-toml')
  const text = await readAsText(file)
  const data = JSON.parse(text)
  return textToBlob(toml.stringify(data), 'toml', file)
}

async function csvToJson(file, _targetFmt, opts = {}) {
  const text = await readAsText(file)
  const rows = parseDelimited(text, ',')
  return textToBlob(JSON.stringify(rowsToObjects(rows), null, opts.pretty ? 2 : 0), 'json', file)
}

async function csvToTsv(file) {
  const text = await readAsText(file)
  const rows = parseDelimited(text, ',')
  return textToBlob(stringifyDelimited(rows, '\t'), 'tsv', file)
}

async function tsvToJson(file, _targetFmt, opts = {}) {
  const text = await readAsText(file)
  const rows = parseDelimited(text, '\t')
  return textToBlob(JSON.stringify(rowsToObjects(rows), null, opts.pretty ? 2 : 0), 'json', file)
}

async function tsvToCsv(file) {
  const text = await readAsText(file)
  const rows = parseDelimited(text, '\t')
  return textToBlob(stringifyDelimited(rows, ','), 'csv', file)
}

async function xmlToJson(file, _targetFmt, opts = {}) {
  const text = await readAsText(file)
  const doc = parseXmlDoc(text)
  const js = xmlToJs(doc.documentElement)
  const wrapped = { [doc.documentElement.nodeName]: js }
  return textToBlob(JSON.stringify(wrapped, null, opts.pretty ? 2 : 0), 'json', file)
}

async function yamlToJson(file, _targetFmt, opts = {}) {
  const YAML = await import('js-yaml')
  const text = await readAsText(file)
  const data = YAML.load(text)
  return textToBlob(JSON.stringify(data, null, opts.pretty ? 2 : 0), 'json', file)
}

async function yamlToToml(file) {
  const YAML = await import('js-yaml')
  const toml = await import('smol-toml')
  const text = await readAsText(file)
  const data = YAML.load(text)
  return textToBlob(toml.stringify(data), 'toml', file)
}

async function tomlToJson(file, _targetFmt, opts = {}) {
  const toml = await import('smol-toml')
  const text = await readAsText(file)
  const data = toml.parse(text)
  return textToBlob(JSON.stringify(data, null, opts.pretty ? 2 : 0), 'json', file)
}

async function tomlToYaml(file) {
  const toml = await import('smol-toml')
  const YAML = await import('js-yaml')
  const text = await readAsText(file)
  const data = toml.parse(text)
  return textToBlob(YAML.dump(data, { indent: 2, lineWidth: 120 }), 'yaml', file)
}

async function mdToHtml(file) {
  const { marked } = await import('marked')
  const text = await readAsText(file)
  const html = `<!doctype html>\n<html><head><meta charset="utf-8"><title>${nameWithoutExt(file.name)}</title></head><body>${marked.parse(text)}</body></html>`
  return textToBlob(html, 'html', file)
}

async function htmlToMd(file) {
  const text = await readAsText(file)
  return textToBlob(htmlToMarkdown(text), 'md', file)
}

function htmlToMarkdown(html) {
  let s = html
  s = s.replace(/<script[\s\S]*?<\/script>/gi, '')
  s = s.replace(/<style[\s\S]*?<\/style>/gi, '')
  s = s.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, '# $1\n\n')
  s = s.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, '## $1\n\n')
  s = s.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, '### $1\n\n')
  s = s.replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, '#### $1\n\n')
  s = s.replace(/<h5[^>]*>([\s\S]*?)<\/h5>/gi, '##### $1\n\n')
  s = s.replace(/<h6[^>]*>([\s\S]*?)<\/h6>/gi, '###### $1\n\n')
  s = s.replace(/<(strong|b)[^>]*>([\s\S]*?)<\/(strong|b)>/gi, '**$2**')
  s = s.replace(/<(em|i)[^>]*>([\s\S]*?)<\/(em|i)>/gi, '*$2*')
  s = s.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, '`$1`')
  s = s.replace(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, '[$2]($1)')
  s = s.replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*\/?>/gi, '![$2]($1)')
  s = s.replace(/<img[^>]*alt="([^"]*)"[^>]*src="([^"]*)"[^>]*\/?>/gi, '![$1]($2)')
  s = s.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '- $1\n')
  s = s.replace(/<\/(ul|ol)>/gi, '\n')
  s = s.replace(/<(ul|ol)[^>]*>/gi, '')
  s = s.replace(/<br\s*\/?>/gi, '\n')
  s = s.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, '$1\n\n')
  s = s.replace(/<[^>]+>/g, '')
  s = s.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
  return s.replace(/\n{3,}/g, '\n\n').trim()
}

async function textToPdf(file, _targetFmt, opts = {}) {
  const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib')
  const text = await readAsText(file)
  const pdf = await PDFDocument.create()
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const fontSize = opts.fontSize || 11
  const pageWidth = 595.28
  const pageHeight = 841.89
  const margin = 50
  const maxWidth = pageWidth - margin * 2
  const lineHeight = fontSize * 1.4
  const lines = []
  for (const rawLine of text.split('\n')) {
    if (rawLine === '') { lines.push(''); continue }
    let remaining = rawLine
    while (remaining.length > 0) {
      let cut = remaining.length
      while (cut > 0 && font.widthOfTextAtSize(remaining.slice(0, cut), fontSize) > maxWidth) cut--
      if (cut === 0) { lines.push(remaining); break }
      let cutAt = cut
      if (cut < remaining.length) {
        const space = remaining.lastIndexOf(' ', cut)
        if (space > 0) cutAt = space
      }
      lines.push(remaining.slice(0, cutAt))
      remaining = remaining.slice(cutAt).replace(/^\s/, '')
    }
  }
  let page = pdf.addPage([pageWidth, pageHeight])
  let y = pageHeight - margin
  for (const line of lines) {
    if (y < margin + lineHeight) { page = pdf.addPage([pageWidth, pageHeight]); y = pageHeight - margin }
    // eslint-disable-next-line no-control-regex
    const safe = line.replace(/[^\x00-\x7F]/g, '?')
    page.drawText(safe, { x: margin, y, size: fontSize, font, color: rgb(0, 0, 0) })
    y -= lineHeight
  }
  const bytes = await pdf.save()
  return { blob: new Blob([bytes], { type: 'application/pdf' }), filename: `${nameWithoutExt(file.name)}.pdf`, mime: 'application/pdf' }
}

// ----- Base64 ----------------------------------------------------------------

async function anyToBase64(file) {
  const buf = await readAsArrayBuffer(file)
  let binary = ''
  const bytes = new Uint8Array(buf)
  const CHUNK = 0x8000
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK))
  }
  const b64 = btoa(binary)
  return { blob: new Blob([b64], { type: 'text/plain' }), filename: `${nameWithoutExt(file.name)}.base64.txt`, mime: 'text/plain' }
}

// ----- Conversion map --------------------------------------------------------

const passthroughText = (fmt) => async (f) => textToBlob(await readAsText(f), fmt, f)

export const CONVERSIONS = {
  png: { jpeg: imageToImage, webp: imageToImage, gif: imageToImage, bmp: imageToImage, ico: imageToImage, pdf: imageToPdf, base64: anyToBase64 },
  jpeg: { png: imageToImage, webp: imageToImage, gif: imageToImage, bmp: imageToImage, ico: imageToImage, pdf: imageToPdf, base64: anyToBase64 },
  webp: { png: imageToImage, jpeg: imageToImage, gif: imageToImage, bmp: imageToImage, ico: imageToImage, pdf: imageToPdf, base64: anyToBase64 },
  gif: { png: imageToImage, jpeg: imageToImage, webp: imageToImage, bmp: imageToImage, pdf: imageToPdf, base64: anyToBase64 },
  bmp: { png: imageToImage, jpeg: imageToImage, webp: imageToImage, base64: anyToBase64 },
  ico: { png: imageToImage, jpeg: imageToImage, webp: imageToImage, base64: anyToBase64 },
  avif: { png: imageToImage, jpeg: imageToImage, webp: imageToImage, base64: anyToBase64 },
  tiff: { png: imageToImage, jpeg: imageToImage, base64: anyToBase64 },

  pdf: { png: pdfToImages, jpeg: pdfToImages, webp: pdfToImages, txt: pdfToText, base64: anyToBase64 },

  docx: { html: docxToHtml, txt: docxToText, md: docxToMarkdown, base64: anyToBase64 },

  json: { csv: jsonToCsv, tsv: jsonToTsv, xml: jsonToXml, yaml: jsonToYaml, toml: jsonToToml, txt: passthroughText('txt'), base64: anyToBase64 },
  csv: { json: csvToJson, tsv: csvToTsv, txt: passthroughText('txt'), base64: anyToBase64 },
  tsv: { json: tsvToJson, csv: tsvToCsv, txt: passthroughText('txt'), base64: anyToBase64 },
  xml: { json: xmlToJson, txt: passthroughText('txt'), base64: anyToBase64 },
  yaml: { json: yamlToJson, toml: yamlToToml, txt: passthroughText('txt'), base64: anyToBase64 },
  toml: { json: tomlToJson, yaml: tomlToYaml, txt: passthroughText('txt'), base64: anyToBase64 },

  md: { html: mdToHtml, pdf: textToPdf, txt: passthroughText('txt'), base64: anyToBase64 },
  html: { md: htmlToMd, txt: async (f) => { const text = await readAsText(f); return textToBlob(text.replace(/<[^>]+>/g, ''), 'txt', f) }, pdf: textToPdf, base64: anyToBase64 },
  txt: { pdf: textToPdf, md: passthroughText('md'), base64: anyToBase64 },
}

export function getClientTargets(srcFormat) {
  if (!srcFormat) return []
  return Object.keys(CONVERSIONS[srcFormat] || {})
}

export function canConvertClient(srcFormat, targetFormat) {
  return Boolean(CONVERSIONS[srcFormat]?.[targetFormat])
}

export async function convertClient(file, srcFormat, targetFormat, opts = {}) {
  const handlers = CONVERSIONS[srcFormat]
  if (!handlers || !handlers[targetFormat]) {
    throw new Error(`No client-side converter from ${srcFormat.toUpperCase()} to ${targetFormat.toUpperCase()}. Try Server Conversion.`)
  }
  return handlers[targetFormat](file, targetFormat, opts)
}
