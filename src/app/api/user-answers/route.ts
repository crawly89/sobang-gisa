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

    // 1. 로그인한 사용자 확인
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: { user } } = await supabase.auth.getUser()

    let userId = user?.id
    let isNewUser = false

    // 2. 익명 사용자 ID 가져오기 또는 생성
    if (!userId) {
      const cookieStore = await cookies()
      userId = cookieStore.get('anonymous_user_id')?.value

      if (!userId) {
        // 간단한 랜덤 ID 생성
        userId = `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        isNewUser = true
      }
    }

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

    // 1. 로그인한 사용자 확인
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
    )

    const { data: { user } } = await supabase.auth.getUser()

    let userId = user?.id

    // 2. 익명 사용자 ID 확인
    if (!userId) {
      const cookieStore = await cookies()
      userId = cookieStore.get('anonymous_user_id')?.value
    }

    if (!userId) {
      return NextResponse.json({ answers: [] })
    }

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
