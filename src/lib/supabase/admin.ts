import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

/**
 * 관리자 전용 Supabase 클라이언트
 * Service Role Key를 사용하여 RLS를 우회하고 모든 데이터에 접근
 */
export async function createAdminClient() {
  const cookieStore = await cookies()

  // 관리자 인증 확인
  const isAdmin = cookieStore.get('admin_auth')?.value === process.env.ADMIN_PASSWORD

  if (!isAdmin) {
    throw new Error('Unauthorized: Admin access required')
  }

  // Service Role Key로 RLS 우회
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}

/**
 * 일반 사용용 Supabase 클라이언트 (RLS 적용)
 */
export async function createClientAsAdmin() {
  const cookieStore = await cookies()
  const isAdmin = cookieStore.get('admin_auth')?.value === process.env.ADMIN_PASSWORD

  if (!isAdmin) {
    throw new Error('Unauthorized: Admin access required')
  }

  // Anon key 사용하지만 관리자 권한으로 처리
  const { createClient } = await import('@supabase/supabase-js')
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  )
}
