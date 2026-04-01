import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')
  const redirectTo = request.nextUrl.searchParams.get('redirectTo') || '/dashboard'

  if (token) {
    const supabase = await createClient()
    await supabase.auth.verifyOtp({
      token_hash: token,
      type: 'email',
    })
  }

  // URL에 리다이렉션 처리
  return NextResponse.redirect(new URL(redirectTo, request.url))
}
