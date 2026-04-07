import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useDeviceId } from '../contexts/DeviceContext'

const DEBOUNCE_MS = 500

/** Dispatched after Settings import (or any bulk localStorage write) so hooks re-read their keys. */
export const FORGE_STORAGE_IMPORT = 'forge-storage-import'

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
          try { localStorage.setItem(localKey, JSON.stringify(data.data)) } catch { /* quota exceeded */ }
        }
      })
  }, [deviceId, category])

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
      try { localStorage.setItem(localKey, JSON.stringify(next)) } catch { /* quota exceeded */ }

      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        if (!deviceId) return
        supabase
          .from('forge_data')
          .upsert(
            { device_id: deviceId, category, data: next, updated_at: new Date().toISOString() },
            { onConflict: 'device_id,category' }
          )
          .then(() => {})
      }, DEBOUNCE_MS)

      return next
    })
  }, [deviceId, category, localKey])

  return [value, update]
}
