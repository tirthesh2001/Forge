import toast from 'react-hot-toast'
import { pushClipboard } from './pushClipboard'

/** Writes to the system clipboard, records in Forge clipboard history, and shows a toast. */
export function copyWithHistory(text, message = 'Copied') {
  const t = typeof text === 'string' ? text : String(text ?? '')
  void navigator.clipboard.writeText(t).then(() => {
    pushClipboard(t)
    if (message) toast.success(message)
  }).catch(() => {
    toast.error('Copy failed')
  })
}
