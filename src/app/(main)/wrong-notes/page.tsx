import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import type { Subject } from '@/types'

export const metadata: Metadata = { title: '오답노트' }

const SUBJECT_LABELS: Record<Subject, string> = {
  fire_principles:     '소방원론',
  fluid_mechanics:     '소방유체역학',
  fire_law:            '소방관계법규',
  suppression_systems: '소화설비',
  alarm_evacuation:    '경보 및 피난설비',
  electrical_general:  '소방전기일반',
  electrical_systems:  '소방전기시설의 구조 및 원리',
  hazmat:              '위험물의 성상 및 시설기준',
}

const OPTIONS = ['①', '②', '③', '④']

export default async function WrongNotesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login?redirectTo=/wrong-notes')

  // 틀린 문제 목록 (최근 기준, 문제 정보 포함)
  const { data: wrongAnswers } = await supabase
    .from('user_answers')
    .select(`
      id,
      selected_answer,
      answered_at,
      questions (
        id, subject, question_text,
        option_a, option_b, option_c, option_d,
        answer, explanation
      )
    `)
    .eq('user_id', user.id)
    .eq('is_correct', false)
    .order('answered_at', { ascending: false })
    .limit(50)

  const questions = wrongAnswers
    ?.map(a => ({
      answerId: a.id,
      selectedAnswer: a.selected_answer as 1 | 2 | 3 | 4,
      answeredAt: a.answered_at,
      ...(a.questions as unknown as {
        id: string
        subject: Subject
        question_text: string
        option_a: string
        option_b: string
        option_c: string
        option_d: string
        answer: 1 | 2 | 3 | 4
        explanation: string | null
      }),
    }))
    .filter(Boolean) || []

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">오답노트</h1>
          <p className="text-gray-500 text-sm mt-1">틀린 문제를 다시 확인하고 완벽하게 익혀요.</p>
        </div>
        <span className="bg-red-100 text-red-600 font-bold text-sm px-3 py-1 rounded-full">
          {questions.length}문제
        </span>
      </div>

      {questions.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-10 text-center">
          <div className="text-4xl mb-3">🎉</div>
          <p className="text-gray-700 font-medium">틀린 문제가 없어요!</p>
          <p className="text-gray-400 text-sm mt-1 mb-6">문제를 더 풀면 오답이 여기 쌓여요.</p>
          <Link href="/practice" className="bg-red-600 text-white px-6 py-2 rounded-full text-sm font-medium hover:bg-red-700">
            문제 풀러 가기
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {questions.map((q, idx) => {
            const opts = [q.option_a, q.option_b, q.option_c, q.option_d]
            return (
              <div key={q.answerId} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                {/* 문제 헤더 */}
                <div className="flex items-center gap-2 px-5 py-3 bg-gray-50 border-b border-gray-100">
                  <span className="text-xs bg-red-100 text-red-600 font-medium px-2 py-0.5 rounded">
                    {SUBJECT_LABELS[q.subject]}
                  </span>
                  <span className="text-xs text-gray-400">
                    {new Date(q.answeredAt).toLocaleDateString('ko-KR')}
                  </span>
                </div>

                {/* 문제 본문 */}
                <div className="p-5">
                  <p className="font-medium text-gray-900 mb-4 leading-relaxed">
                    {idx + 1}. {q.question_text}
                  </p>

                  {/* 선택지 */}
                  <div className="space-y-2 mb-4">
                    {opts.map((opt, i) => {
                      const num = (i + 1) as 1 | 2 | 3 | 4
                      const isCorrect = num === q.answer
                      const isSelected = num === q.selectedAnswer
                      return (
                        <div
                          key={i}
                          className={`flex items-start gap-2 p-3 rounded-lg text-sm ${
                            isCorrect
                              ? 'bg-green-50 border border-green-200 text-green-800'
                              : isSelected
                              ? 'bg-red-50 border border-red-200 text-red-700 line-through'
                              : 'text-gray-600'
                          }`}
                        >
                          <span className="font-medium flex-shrink-0">{OPTIONS[i]}</span>
                          <span>{opt}</span>
                          {isCorrect && <span className="ml-auto text-green-600 font-bold flex-shrink-0">✓ 정답</span>}
                          {isSelected && !isCorrect && <span className="ml-auto text-red-500 flex-shrink-0">✗ 내 답</span>}
                        </div>
                      )
                    })}
                  </div>

                  {/* 해설 */}
                  {q.explanation && (
                    <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-sm text-blue-800">
                      <span className="font-medium">해설</span>
                      <p className="mt-1 leading-relaxed">{q.explanation}</p>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
