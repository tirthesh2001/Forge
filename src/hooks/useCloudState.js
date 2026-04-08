import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useDeviceId } from '../contexts/DeviceContext'
import { SOFT_MAX_PERSIST_BYTES } from '../constants/storageLimits'
import { notifyStorageQuotaExceeded, notifyLargePayloadNotPersisted } from '../utils/storageNotify'

const DEBOUNCE_MS = 500

/** Dispatched after Settings import (or any bulk localStorage write) so hooks re-read their keys. */
export const FORGE_STORAGE_IMPORT = 'forge-storage-import'

function persistLocalAndReturnIfSynced(key, value) {
  const serialized = JSON.stringify(value)
  if (serialized.length > SOFT_MAX_PERSIST_BYTES) {
    notifyLargePayloadNotPersisted()
    return false
  }
  try {
    localStorage.setItem(key, serialized)
    return true
  } catch {
    notifyStorageQuotaExceeded()
    return false
  }
}

export default function useCloudState(category, defaultValue) {
  const deviceId = useDeviceId()
  const localKey = `forge-${category}`

  const [value, setValue] = useState(() => {
    try {
      const stored = localStorage.getItem(localKey)
      return stored !== null ? JSON.parse(stored) : defaultValue
    } catch {
      return defaultValue
    }
  })

  const timerRef = useRef(null)
  const mountedRef = useRef(true)
  const defaultRef = useRef(defaultValue)

  useEffect(() => {
    defaultRef.current = defaultValue
  }, [defaultValue])

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  useEffect(() => {
    if (!deviceId) return
    supabase
      .from('forge_data')
      .select('data')
      .eq('device_id', deviceId)
      .eq('category', category)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!error && data && mountedRef.current) {
          setValue(data.data)
          persistLocalAndReturnIfSynced(localKey, data.data)
        }
      })
  }, [deviceId, category, localKey])

  useEffect(() => {
    const onImport = () => {
      try {
        const stored = localStorage.getItem(localKey)
        if (stored !== null) setValue(JSON.parse(stored))
        else setValue(defaultRef.current)
      } catch {
        setValue(defaultRef.current)
      }
    }
    window.addEventListener(FORGE_STORAGE_IMPORT, onImport)
    return () => window.removeEventListener(FORGE_STORAGE_IMPORT, onImport)
  }, [localKey])

  const update = useCallback((valOrFn) => {
    setValue((prev) => {
      const next = typeof valOrFn === 'function' ? valOrFn(prev) : valOrFn
      const serialized = JSON.stringify(next)
      const underLimit = serialized.length <= SOFT_MAX_PERSIST_BYTES

      if (underLimit) {
        try {
          localStorage.setItem(localKey, serialized)
        } catch {
          notifyStorageQuotaExceeded()
        }
      } else {
        notifyLargePayloadNotPersisted()
      }

      if (timerRef.current) clearTimeout(timerRef.current)
      if (underLimit && deviceId) {
        timerRef.current = setTimeout(() => {
          supabase
            .from('forge_data')
            .upsert(
              { device_id: deviceId, category, data: next, updated_at: new Date().toISOString() },
              { onConflict: 'device_id,category' },
            )
            .then(() => {})
        }, DEBOUNCE_MS)
      }

      return next
    })
  }, [deviceId, category, localKey])

  return [value, update]
}
