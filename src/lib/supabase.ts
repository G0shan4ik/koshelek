import { createClient, SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isCloudConfigured = Boolean(url && anonKey && url.startsWith('http'))

export const supabase: SupabaseClient | null = isCloudConfigured ? createClient(url!, anonKey!) : null
