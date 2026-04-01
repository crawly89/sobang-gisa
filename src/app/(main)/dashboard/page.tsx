import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import type { Subject } from '@/types'

export const metadata: Metadata = { title: '학습 통계' }

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

async function getUserId() {
  // 1. 로그인한 사용자 확인
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) return user.id

  // 2. 익명 사용자 ID 확인
  const cookieStore = await cookies()
  const anonymousId = cookieStore.get('anonymous_user_id')?.value

  if (anonymousId) return anonymousId

  // 3. 사용자 ID 없음 - 로그인 유도
  return null
}

export default async function DashboardPage() {
  const userId = await getUserId()

  if (!userId) {
    return (
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">학습 통계</h1>

        <div className="bg-white rounded-xl border border-gray-100 p-10 text-center">
          <div className="text-4xl mb-4">📊</div>
          <p className="text-gray-500 mb-6">
            로그인하면 학습 통계를 확인할 수 있어요.
          </p>
          <div className="flex gap-3 justify-center">
            <Link
              href="/login?redirectTo=/dashboard"
              className="bg-red-600 text-white px-6 py-2 rounded-full text-sm font-medium hover:bg-red-700"
            >
              로그인
            </Link>
            <Link
              href="/practice"
              className="border border-gray-200 text-gray-700 px-6 py-2 rounded-full text-sm font-medium hover:bg-gray-50"
            >
              비회원으로 계속하기
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const supabase = await createClient()

  // 전체 풀이 기록 통계
  const { data: answerStats } = await supabase
    .from('user_answers')
    .select('is_correct, questions(subject)')
    .eq('user_id', userId)

  const totalAnswered = answerStats?.length || 0
  const totalCorrect = answerStats?.filter(a => a.is_correct).length || 0
  const overallRate = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0

  // 과목별 정답률
  type SubjectStat = { total: number; correct: number }
  const subjectMap: Partial<Record<Subject, SubjectStat>> = {}

  for (const row of answerStats || []) {
    const subj = (row.questions as unknown as { subject: Subject } | null)?.subject
    if (!subj) continue
    if (!subjectMap[subj]) subjectMap[subj] = { total: 0, correct: 0 }
    subjectMap[subj]!.total++
    if (row.is_correct) subjectMap[subj]!.correct++
  }

  const subjectStats = Object.entries(subjectMap).map(([subject, stat]) => ({
    subject: subject as Subject,
    total: stat!.total,
    correct: stat!.correct,
    rate: Math.round((stat!.correct / stat!.total) * 100),
  })).sort((a, b) => a.rate - b.rate)

  const weakSubjects = subjectStats.filter(s => s.rate < 60)

  // 최근 모의고사
  const { data: recentExams } = await supabase
    .from('mock_exams')
    .select('id, exam_field, score, completed_at')
    .eq('user_id', userId)
    .not('completed_at', 'is', null)
    .order('completed_at', { ascending: false })
    .limit(5)

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">학습 통계</h1>

      {/* 전체 요약 */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
          <div className="text-2xl font-bold text-gray-900">{totalAnswered.toLocaleString()}</div>
          <div className="text-sm text-gray-400 mt-1">총 풀이 문제</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
          <div className={`text-2xl font-bold ${overallRate >= 60 ? 'text-green-600' : 'text-red-600'}`}>
            {overallRate}%
          </div>
          <div className="text-sm text-gray-400 mt-1">전체 정답률</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
          <div className="text-2xl font-bold text-gray-900">{recentExams?.length || 0}</div>
          <div className="text-sm text-gray-400 mt-1">모의고사 횟수</div>
        </div>
      </div>

      {/* 취약 과목 경고 */}
      {weakSubjects.length > 0 && (
        <div className="bg-red-50 border border-red-100 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <span className="text-red-500 text-xl">⚠️</span>
            <div>
              <p className="font-medium text-red-700 mb-1">취약 과목이 있어요</p>
              <p className="text-sm text-red-600 mb-3">
                아래 과목의 정답률이 60% 미만입니다. 집중 학습이 필요해요.
              </p>
              <div className="flex flex-wrap gap-2">
                {weakSubjects.map(s => (
                  <Link
                    key={s.subject}
                    href={`/practice/mechanical/${s.subject}`}
                    className="bg-red-100 text-red-700 text-sm px-3 py-1 rounded-full hover:bg-red-200"
                  >
                    {SUBJECT_LABELS[s.subject]} ({s.rate}%)
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 과목별 정답률 */}
      {subjectStats.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 p-5 mb-6">
          <h2 className="font-bold text-gray-900 mb-4">과목별 정답률</h2>
          <div className="space-y-4">
            {subjectStats.map(s => (
              <div key={s.subject}>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-gray-700">{SUBJECT_LABELS[s.subject]}</span>
                  <span className={`font-bold ${
                    s.rate >= 80 ? 'text-green-600' :
                    s.rate >= 60 ? 'text-blue-600' : 'text-red-600'
                  }`}>
                    {s.rate}% ({s.correct}/{s.total})
                  </span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full">
                  <div
                    className={`h-full rounded-full transition-all ${
                      s.rate >= 80 ? 'bg-green-400' :
                      s.rate >= 60 ? 'bg-blue-400' : 'bg-red-400'
                    }`}
                    style={{ width: `${s.rate}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 최근 모의고사 */}
      {recentExams && recentExams.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h2 className="font-bold text-gray-900 mb-4">최근 모의고사</h2>
          <div className="space-y-3">
            {recentExams.map(exam => (
              <div key={exam.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div>
                  <span className="text-sm font-medium text-gray-700">
                    {exam.exam_field === 'mechanical' ? '기계분야' : '전기분야'}
                  </span>
                  <span className="text-xs text-gray-400 ml-2">
                    {exam.completed_at ? new Date(exam.completed_at).toLocaleDateString('ko-KR') : ''}
                  </span>
                </div>
                <span className={`font-bold text-sm ${
                  (exam.score || 0) >= 60 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {exam.score}점
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 데이터 없을 때 */}
      {totalAnswered === 0 && (
        <div className="bg-white rounded-xl border border-gray-100 p-10 text-center">
          <p className="text-gray-400 mb-4">아직 푼 문제가 없어요.</p>
          <Link href="/practice" className="bg-red-600 text-white px-6 py-2 rounded-full text-sm font-medium hover:bg-red-700">
            문제 풀러 가기
          </Link>
        </div>
      )}
    </div>
  )
}
