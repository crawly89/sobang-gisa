import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { ExamField } from '@/types'
import YearPracticeClient from './YearPracticeClient'

interface Props {
  params: Promise<{
    field: ExamField
    year: string
  }>
}

async function getQuestions(field: ExamField, year: number) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('questions')
    .select('*')
    .eq('exam_field', field)
    .eq('year', year)
    .eq('verified', true)
    .order('round', { ascending: true })
    .order('question_number', { ascending: true })

  if (error) {
    console.error('Error fetching questions:', error)
    return []
  }

  return data || []
}

export async function generateMetadata({ params }: Props) {
  const { field, year } = await params
  return {
    title: `${year}년 기출문제 - ${field === 'mechanical' ? '기계' : '전기'}분야`,
  }
}

export default async function YearPracticePage({ params }: Props) {
  const { field, year: yearStr } = await params
  const year = parseInt(yearStr)

  // 유효성 검사
  const validFields: ExamField[] = ['mechanical', 'electrical']
  const validYears = Array.from({ length: 20 }, (_, i) => 2024 - i) // 2005~2024

  if (!validFields.includes(field) || !validYears.includes(year)) {
    notFound()
  }

  const questions = await getQuestions(field, year)

  // 회차별로 그룹화
  const groupedByRound = questions.reduce((acc, q) => {
    const round = q.round || 'unknown'
    if (!acc[round]) {
      acc[round] = []
    }
    acc[round].push(q)
    return acc
  }, {} as Record<number | string, typeof questions>)

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {year}년 기출문제
        </h1>
        <p className="text-gray-500">
          {field === 'mechanical' ? '기계' : '전기'}분야 · 총 {questions.length}문제
        </p>
      </div>

      {questions.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
          <div className="text-4xl mb-4">📋</div>
          <p className="text-gray-500 mb-2">아직 {year}년 기출문제가 준비되지 않았습니다.</p>
          <p className="text-sm text-gray-400">큐넷에서 스크래핑하여 추가 예정입니다.</p>
        </div>
      ) : (
        <YearPracticeClient
          questions={questions}
          groupedByRound={groupedByRound}
          year={year}
          field={field}
        />
      )}
    </div>
  )
}
