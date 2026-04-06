import { createClient } from '@supabase/supabase-js'

// Vercel: add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY under Project → Settings → Environment Variables
// (Production + Preview). Vite inlines import.meta.env.VITE_* at build time only — not runtime process.env.
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://opcfhuhkuonbnfnnveui.supabase.co'
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
