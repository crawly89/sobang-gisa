import { createBrowserClient } from '@supabase/ssr'

// 신규 프로젝트: PUBLISHABLE_KEY / 구버전 프로젝트: ANON_KEY
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    supabaseKey
  )
}
