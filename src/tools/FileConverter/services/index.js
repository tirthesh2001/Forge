import { convertClient, getClientTargets, canConvertClient } from './clientConverter'
import { convertServer, getServerTargets, canConvertServer, getServerApiKey, setServerApiKey, hasServerConfig } from './serverConverter'

export { getServerApiKey, setServerApiKey, hasServerConfig }

export function getAllTargets(srcFormat) {
  const client = new Set(getClientTargets(srcFormat))
  const server = new Set(getServerTargets(srcFormat))
  const all = new Set([...client, ...server])
  return Array.from(all).map((fmt) => ({
    format: fmt,
    client: client.has(fmt),
    server: server.has(fmt),
  }))
}

export function modeSupports(srcFormat, targetFormat, mode) {
  if (mode === 'client') return canConvertClient(srcFormat, targetFormat)
  if (mode === 'server') return canConvertServer(srcFormat, targetFormat)
  return false
}

export async function runConversion({ file, srcFormat, targetFormat, mode, opts, onProgress }) {
  if (mode === 'server') {
    return convertServer(file, srcFormat, targetFormat, { onProgress })
  }
  if (mode === 'client') {
    onProgress?.({ phase: 'converting', pct: 30 })
    const res = await convertClient(file, srcFormat, targetFormat, opts)
    onProgress?.({ phase: 'done', pct: 100 })
    return res
  }
  throw new Error(`Unknown conversion mode: ${mode}`)
}
