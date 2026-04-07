import {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
} from 'react'
import { registerClipboardPush, pushClipboard as recordPush } from '../utils/pushClipboard'

const STORAGE_KEY = 'forge-clipboard-history'
const MAX_ITEMS = 45

const ClipboardHistoryContext = createContext(null)

export function ClipboardHistoryProvider({ children }) {
  const [items, setItems] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      const parsed = raw ? JSON.parse(raw) : []
      if (!Array.isArray(parsed)) return []
      return parsed.filter((x) => typeof x === 'string').slice(0, MAX_ITEMS)
    } catch {
      return []
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
    } catch {
      /* quota */
    }
  }, [items])

  const push = useCallback((text) => {
    setItems((prev) => {
      if (prev[0] === text) return prev
      return [text, ...prev.filter((t) => t !== text)].slice(0, MAX_ITEMS)
    })
  }, [])

  useEffect(() => {
    registerClipboardPush(push)
    return () => registerClipboardPush(null)
  }, [push])

  useEffect(() => {
    const onCopy = (e) => {
      const t = e.clipboardData?.getData('text/plain')
      if (t && t.trim()) push(t.trim())
    }
    document.addEventListener('copy', onCopy)
    return () => document.removeEventListener('copy', onCopy)
  }, [push])

  const copyAgain = useCallback((text) => {
    void navigator.clipboard.writeText(text).then(() => recordPush(text))
  }, [])

  const value = useMemo(() => ({ items, push, copyAgain }), [items, push, copyAgain])

  return (
    <ClipboardHistoryContext.Provider value={value}>
      {children}
    </ClipboardHistoryContext.Provider>
  )
}

export function useClipboardHistory() {
  const ctx = useContext(ClipboardHistoryContext)
  if (!ctx) throw new Error('useClipboardHistory must be used within ClipboardHistoryProvider')
  return ctx
}
