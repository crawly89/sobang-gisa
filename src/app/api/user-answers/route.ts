import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const { questionId, selectedAnswer, timeSpent } = await request.json()

    if (!questionId || !selectedAnswer) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // 익명 사용자 ID 가져오기 또는 생성
    const cookieStore = await cookies()
    let userId = cookieStore.get('anonymous_user_id')?.value

    if (!userId) {
      // 간단한 랜덤 ID 생성
      userId = `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

      // 즉시 쿠키에 저장 (다음 요청부터 사용)
      const response = NextResponse.json({
        success: true,
        userId: userId,
        message: '새 사용자 ID 생성됨'
      })

      response.cookies.set('anonymous_user_id', userId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7일
      })

      // 쿠키 설정 후에도 계속 진행해야 하므로 response는 저장하지 않고 변수만 사용
      // userId는 이제 사용 가능
    }

    // Supabase 클라이언트 생성
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 문제 정보 가져오기 (정답 확인용)
    const { data: question, error: questionError } = await supabase
      .from('questions')
      .select('answer')
      .eq('id', questionId)
      .single()

    if (questionError || !question) {
      return NextResponse.json(
        { error: 'Question not found' },
        { status: 404 }
      )
    }

    const isCorrect = selectedAnswer === question.answer

    // 답안 저장
    const { data, error } = await supabase
      .from('user_answers')
      .insert({
        user_id: userId,
        question_id: questionId,
        selected_answer: selectedAnswer,
        is_correct: isCorrect,
        time_spent: timeSpent || 0,
        answered_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      console.error('Error saving answer:', error)
      return NextResponse.json(
        { error: 'Failed to save answer', details: error.message },
        { status: 500 }
      )
    }

    // 첫 생성된 사용자 ID인 경우에만 쿠키 설정
    const isNewUser = !cookieStore.get('anonymous_user_id')?.value

    const response = NextResponse.json({
      success: true,
      isCorrect,
      answer: data,
      userId,
      isNewUser
    })

    if (isNewUser) {
      response.cookies.set('anonymous_user_id', userId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7일
      })
    }

    return response
  } catch (error) {
    console.error('Error in user-answers API:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    )
  }
}

// GET: 사용자의 답안 기록 가져오기
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const questionId = searchParams.get('questionId')

    const cookieStore = await cookies()
    const userId = cookieStore.get('anonymous_user_id')?.value

    if (!userId) {
      return NextResponse.json({ answers: [] })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
    )

    let query = supabase
      .from('user_answers')
      .select('*')
      .eq('user_id', userId)

    if (questionId) {
      query = query.eq('question_id', questionId)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching answers:', error)
      return NextResponse.json(
        { error: 'Failed to fetch answers' },
        { status: 500 }
      )
    }

    return NextResponse.json({ answers: data || [] })
  } catch (error) {
    console.error('Error in user-answers GET:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
