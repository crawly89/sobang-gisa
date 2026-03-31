import { createClient } from '@/lib/supabase/server'
import AdminDashboardClient from './AdminDashboardClient'

async function getUnverifiedQuestions() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('questions')
    .select('*')
    .eq('verified', false)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching unverified questions:', error)
    return []
  }

  return data || []
}

export const metadata = {
  title: '관리자 대시보드',
}

export default async function AdminPage() {
  const questions = await getUnverifiedQuestions()

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">관리자 대시보드</h1>
        <p className="text-gray-500">
          AI 생성 문제 검수 및 승인
        </p>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl p-6 border border-gray-100">
          <div className="text-sm text-gray-500 mb-1">검수 대기 중</div>
          <div className="text-3xl font-bold text-orange-600">{questions.length}</div>
        </div>
        <div className="bg-white rounded-xl p-6 border border-gray-100">
          <div className="text-sm text-gray-500 mb-1">총 문제 수</div>
          <div className="text-3xl font-bold text-blue-600">
            {questions.reduce((sum, q) => sum + 1, 0)}
          </div>
        </div>
        <div className="bg-white rounded-xl p-6 border border-gray-100">
          <div className="text-sm text-gray-500 mb-1">검수 필요</div>
          <div className="text-3xl font-bold text-green-600">{questions.length > 0 ? '🔥' : '✅'}</div>
        </div>
      </div>

      {questions.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
          <div className="text-4xl mb-4">🎉</div>
          <p className="text-gray-500 mb-2">검수 대기 중인 문제가 없습니다!</p>
          <p className="text-sm text-gray-400">모든 문제가 검수 완료되었습니다.</p>
        </div>
      ) : (
        <AdminDashboardClient questions={questions} />
      )}
    </div>
  )
}
