import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    // Service Role Key 사용 (관리자 권한)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 검수 대기 중인 모든 문제의 수를 먼저 확인
    const { data: countData, count: totalCount } = await supabase
      .from('questions')
      .select('*', { count: 'exact', head: true })
      .eq('verified', false)

    // 일괄 승인 (최대 100개씩)
    const { data, error } = await supabase
      .from('questions')
      .update({ verified: true })
      .eq('verified', false)
      .select('id')

    if (error) {
      console.error('Error verifying all questions:', error)
      return NextResponse.json(
        { error: 'Failed to verify questions' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      verified: data?.length || 0,
      message: `${data?.length || 0}개 문제를 승인했습니다.`
    })
  } catch (error) {
    console.error('Error in verify-all API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
