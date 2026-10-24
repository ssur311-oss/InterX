import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined

// .env를 아직 안 채웠으면 화면에서 안내 문구를 보여주기 위해 null로 둔다
export const isSupabaseConfigured = Boolean(url && key && !url.includes('xxxxxxxx'))

export const supabase = isSupabaseConfigured ? createClient(url!, key!) : null
