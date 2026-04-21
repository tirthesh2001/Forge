export const FORMAT_CATEGORIES = {
  image: { label: 'Images', formats: ['png', 'jpeg', 'webp', 'gif', 'bmp', 'ico', 'tiff', 'avif', 'svg', 'heic'] },
  document: { label: 'Documents', formats: ['pdf', 'docx', 'doc', 'odt', 'rtf', 'html', 'txt', 'epub'] },
  spreadsheet: { label: 'Spreadsheets', formats: ['xlsx', 'xls', 'ods', 'csv', 'tsv'] },
  presentation: { label: 'Presentations', formats: ['pptx', 'ppt', 'odp'] },
  data: { label: 'Data / Text', formats: ['json', 'xml', 'yaml', 'toml', 'md'] },
  audio: { label: 'Audio', formats: ['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a'] },
  video: { label: 'Video', formats: ['mp4', 'webm', 'mov', 'avi', 'mkv'] },
  archive: { label: 'Archives', formats: ['zip', 'tar', 'gz', '7z', 'rar'] },
  encoding: { label: 'Encoding', formats: ['base64'] },
}

export const EXT_TO_FORMAT = {
  png: 'png', jpg: 'jpeg', jpeg: 'jpeg', webp: 'webp', gif: 'gif', bmp: 'bmp',
  ico: 'ico', avif: 'avif', tiff: 'tiff', tif: 'tiff', svg: 'svg', heic: 'heic', heif: 'heic',
  pdf: 'pdf', docx: 'docx', doc: 'doc', odt: 'odt', rtf: 'rtf', html: 'html', htm: 'html',
  txt: 'txt', epub: 'epub',
  xlsx: 'xlsx', xls: 'xls', ods: 'ods', csv: 'csv', tsv: 'tsv',
  pptx: 'pptx', ppt: 'ppt', odp: 'odp',
  json: 'json', xml: 'xml', yaml: 'yaml', yml: 'yaml', toml: 'toml', md: 'md', markdown: 'md',
  mp3: 'mp3', wav: 'wav', ogg: 'ogg', flac: 'flac', aac: 'aac', m4a: 'm4a',
  mp4: 'mp4', webm: 'webm', mov: 'mov', avi: 'avi', mkv: 'mkv',
  zip: 'zip', tar: 'tar', gz: 'gz', '7z': '7z', rar: 'rar',
  b64: 'base64',
}

export const FORMAT_LABELS = {
  png: 'PNG', jpeg: 'JPEG', webp: 'WebP', gif: 'GIF', bmp: 'BMP', ico: 'ICO',
  avif: 'AVIF', tiff: 'TIFF', svg: 'SVG', heic: 'HEIC',
  pdf: 'PDF', docx: 'DOCX (Word)', doc: 'DOC', odt: 'ODT', rtf: 'RTF',
  html: 'HTML', txt: 'Plain Text', epub: 'EPUB',
  xlsx: 'XLSX (Excel)', xls: 'XLS', ods: 'ODS', csv: 'CSV', tsv: 'TSV',
  pptx: 'PPTX', ppt: 'PPT', odp: 'ODP',
  json: 'JSON', xml: 'XML', yaml: 'YAML', toml: 'TOML', md: 'Markdown',
  mp3: 'MP3', wav: 'WAV', ogg: 'OGG', flac: 'FLAC', aac: 'AAC', m4a: 'M4A',
  mp4: 'MP4', webm: 'WebM', mov: 'MOV', avi: 'AVI', mkv: 'MKV',
  zip: 'ZIP', tar: 'TAR', gz: 'GZ', '7z': '7Z', rar: 'RAR',
  base64: 'Base64',
}

export const FORMAT_MIMES = {
  png: 'image/png', jpeg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif',
  bmp: 'image/bmp', ico: 'image/x-icon', avif: 'image/avif', tiff: 'image/tiff',
  svg: 'image/svg+xml', heic: 'image/heic',
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  doc: 'application/msword',
  odt: 'application/vnd.oasis.opendocument.text',
  rtf: 'application/rtf',
  html: 'text/html', txt: 'text/plain', epub: 'application/epub+zip',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  xls: 'application/vnd.ms-excel',
  ods: 'application/vnd.oasis.opendocument.spreadsheet',
  csv: 'text/csv', tsv: 'text/tab-separated-values',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  ppt: 'application/vnd.ms-powerpoint',
  odp: 'application/vnd.oasis.opendocument.presentation',
  json: 'application/json', xml: 'application/xml',
  yaml: 'application/x-yaml', toml: 'application/toml', md: 'text/markdown',
  mp3: 'audio/mpeg', wav: 'audio/wav', ogg: 'audio/ogg', flac: 'audio/flac',
  aac: 'audio/aac', m4a: 'audio/mp4',
  mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime',
  avi: 'video/x-msvideo', mkv: 'video/x-matroska',
  zip: 'application/zip', tar: 'application/x-tar', gz: 'application/gzip',
  '7z': 'application/x-7z-compressed', rar: 'application/vnd.rar',
  base64: 'text/plain',
}

export const WARN_BYTES = 50 * 1024 * 1024
export const MAX_BYTES = 100 * 1024 * 1024

export function detectFormat(file) {
  const name = (file?.name || '').toLowerCase()
  const ext = name.includes('.') ? name.split('.').pop() : ''
  if (EXT_TO_FORMAT[ext]) return EXT_TO_FORMAT[ext]
  const type = (file?.type || '').toLowerCase()
  for (const [fmt, mime] of Object.entries(FORMAT_MIMES)) {
    if (type && mime && type === mime) return fmt
  }
  if (type.startsWith('image/')) {
    const sub = type.split('/')[1]
    if (EXT_TO_FORMAT[sub]) return EXT_TO_FORMAT[sub]
  }
  if (type.startsWith('text/')) return 'txt'
  return null
}

export function categoryFor(fmt) {
  for (const [key, cat] of Object.entries(FORMAT_CATEGORIES)) {
    if (cat.formats.includes(fmt)) return key
  }
  return 'other'
}
