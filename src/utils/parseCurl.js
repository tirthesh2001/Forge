/**
 * Parses a cURL command string into a structured request object compatible with APITool's loadSnapshot.
 * Handles: -X, -H, -d/--data/--data-raw/--data-binary, --data-urlencode, -F/--form,
 *          -u/--user, -A/--user-agent, quoted strings, backslash line continuations.
 */
export function parseCurl(raw) {
  const result = {
    method: 'GET',
    url: '',
    headers: [],
    body: '',
    bodyContentType: 'none',
    formDataRows: [],
    authType: 'none',
    bearerToken: '',
    basicUser: '',
    basicPass: '',
  }

  if (!raw || typeof raw !== 'string') return result

  const cleaned = raw
    .replace(/\\\r?\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (!cleaned.toLowerCase().startsWith('curl')) return result

  const tokens = tokenize(cleaned)
  const headerRows = []
  const formRows = []
  let hasData = false
  let explicitMethod = null
  let detectedContentType = null

  let i = 1
  while (i < tokens.length) {
    const tok = tokens[i]

    if (tok === '-X' || tok === '--request') {
      explicitMethod = (tokens[++i] || 'GET').toUpperCase()
    } else if (tok === '-H' || tok === '--header') {
      const hval = tokens[++i] || ''
      const colonIdx = hval.indexOf(':')
      if (colonIdx > 0) {
        const key = hval.slice(0, colonIdx).trim()
        const value = hval.slice(colonIdx + 1).trim()
        if (key.toLowerCase() === 'authorization') {
          if (value.toLowerCase().startsWith('bearer ')) {
            result.authType = 'bearer'
            result.bearerToken = value.slice(7).trim()
          } else if (value.toLowerCase().startsWith('basic ')) {
            result.authType = 'basic'
            try {
              const decoded = atob(value.slice(6).trim())
              const sepIdx = decoded.indexOf(':')
              result.basicUser = sepIdx >= 0 ? decoded.slice(0, sepIdx) : decoded
              result.basicPass = sepIdx >= 0 ? decoded.slice(sepIdx + 1) : ''
            } catch {
              headerRows.push({ key, value })
            }
          } else {
            headerRows.push({ key, value })
          }
        } else {
          if (key.toLowerCase() === 'content-type') detectedContentType = value
          headerRows.push({ key, value })
        }
      }
    } else if (tok === '-d' || tok === '--data' || tok === '--data-raw' || tok === '--data-binary') {
      result.body = tokens[++i] || ''
      hasData = true
    } else if (tok === '--data-urlencode') {
      const part = tokens[++i] || ''
      if (!result.body) result.body = part
      else result.body += '&' + part
      hasData = true
      if (!detectedContentType) detectedContentType = 'application/x-www-form-urlencoded'
    } else if (tok === '-F' || tok === '--form') {
      const fval = tokens[++i] || ''
      const eqIdx = fval.indexOf('=')
      formRows.push({
        key: eqIdx >= 0 ? fval.slice(0, eqIdx) : fval,
        value: eqIdx >= 0 ? fval.slice(eqIdx + 1) : '',
      })
      hasData = true
      if (!detectedContentType) detectedContentType = 'multipart/form-data'
    } else if (tok === '-u' || tok === '--user') {
      const cred = tokens[++i] || ''
      const sepIdx = cred.indexOf(':')
      result.authType = 'basic'
      result.basicUser = sepIdx >= 0 ? cred.slice(0, sepIdx) : cred
      result.basicPass = sepIdx >= 0 ? cred.slice(sepIdx + 1) : ''
    } else if (tok === '-A' || tok === '--user-agent') {
      headerRows.push({ key: 'User-Agent', value: tokens[++i] || '' })
    } else if (tok === '--compressed' || tok === '-s' || tok === '--silent' || tok === '-S' || tok === '--show-error'
      || tok === '-k' || tok === '--insecure' || tok === '-L' || tok === '--location' || tok === '-v' || tok === '--verbose'
      || tok === '-i' || tok === '--include') {
      // skip flags that don't take a value
    } else if (tok === '--connect-timeout' || tok === '-m' || tok === '--max-time' || tok === '-o' || tok === '--output') {
      i++ // skip the next value too
    } else if (!tok.startsWith('-') && !result.url) {
      result.url = tok
    }

    i++
  }

  if (explicitMethod) {
    result.method = explicitMethod
  } else if (hasData) {
    result.method = 'POST'
  }

  if (formRows.length > 0) {
    result.bodyContentType = 'multipart/form-data'
    result.formDataRows = formRows
    result.body = ''
  } else if (hasData) {
    if (detectedContentType === 'application/x-www-form-urlencoded') {
      result.bodyContentType = 'application/x-www-form-urlencoded'
      const pairs = result.body.split('&')
      result.formDataRows = pairs.map((p) => {
        const eq = p.indexOf('=')
        return {
          key: eq >= 0 ? decodeURIComponent(p.slice(0, eq)) : decodeURIComponent(p),
          value: eq >= 0 ? decodeURIComponent(p.slice(eq + 1)) : '',
        }
      })
      result.body = ''
    } else {
      const ct = detectedContentType || inferContentType(result.body)
      result.bodyContentType = ct
      headerRows.splice(
        headerRows.findIndex((h) => h.key.toLowerCase() === 'content-type'),
        headerRows.findIndex((h) => h.key.toLowerCase() === 'content-type') >= 0 ? 1 : 0,
      )
    }
  }

  result.headers = headerRows.filter((h) => h.key.toLowerCase() !== 'content-type')

  return result
}

function inferContentType(body) {
  const trimmed = (body || '').trim()
  if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
    return 'application/json'
  }
  if (trimmed.startsWith('<')) return 'application/xml'
  return 'text/plain'
}

function tokenize(input) {
  const tokens = []
  let i = 0
  const len = input.length

  while (i < len) {
    while (i < len && input[i] === ' ') i++
    if (i >= len) break

    const ch = input[i]
    if (ch === "'" || ch === '"') {
      const quote = ch
      let val = ''
      i++
      while (i < len && input[i] !== quote) {
        if (input[i] === '\\' && quote === '"') {
          i++
          if (i < len) val += input[i]
        } else {
          val += input[i]
        }
        i++
      }
      i++
      tokens.push(val)
    } else if (ch === '$' && i + 1 < len && input[i + 1] === "'") {
      let val = ''
      i += 2
      while (i < len && input[i] !== "'") {
        if (input[i] === '\\' && i + 1 < len) {
          i++
          val += input[i]
        } else {
          val += input[i]
        }
        i++
      }
      i++
      tokens.push(val)
    } else {
      let val = ''
      while (i < len && input[i] !== ' ') {
        val += input[i]
        i++
      }
      tokens.push(val)
    }
  }

  return tokens
}
