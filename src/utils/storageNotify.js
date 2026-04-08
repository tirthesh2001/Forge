import toast from 'react-hot-toast'

let quotaToastShown = false
let largePersistToastShown = false

export function notifyStorageQuotaExceeded() {
  if (quotaToastShown) return
  quotaToastShown = true
  toast.error('Browser storage limit reached. Some data may not be saved locally.', { duration: 6000 })
}

export function notifyLargePayloadNotPersisted() {
  if (largePersistToastShown) return
  largePersistToastShown = true
  toast(
    'Large document: not synced to cloud or browser storage. Export or shrink the content to sync across devices.',
    { icon: 'ℹ️', duration: 7000 },
  )
}

export function resetStorageNotifySession() {
  quotaToastShown = false
  largePersistToastShown = false
}
