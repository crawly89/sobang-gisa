import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import type { ExamField, Subject } from '@/types'

export const metadata: Metadata = { title: '문제풀기' }

const SUBJECT_LABELS: Record<Subject, string> = {
  fire_principles:    '소방원론',
  fluid_mechanics:    '소방유체역학',
  fire_law:           '소방관계법규',
  suppression_systems:'소화설비',
  alarm_evacuation:   '경보 및 피난설비',
  electrical_general: '소방전기일반',
  electrical_systems: '소방전기시설의 구조 및 원리',
  hazmat:             '위험물의 성상 및 시설기준',
}

const MECHANICAL_SUBJECTS: Subject[] = [
  'fire_principles', 'fluid_mechanics', 'fire_law', 'suppression_systems', 'alarm_evacuation',
]
const ELECTRICAL_SUBJECTS: Subject[] = [
  'fire_principles', 'electrical_general', 'fire_law', 'electrical_systems', 'hazmat',
]

async function getQuestionCounts() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('questions')
    .select('exam_field, subject')

  if (!data) return {}

  const counts: Record<string, number> = {}
  for (const row of data) {
    const key = `${row.exam_field}-${row.subject}`
    counts[key] = (counts[key] || 0) + 1
  }
  return counts
}

interface Props {
  searchParams: Promise<{ field?: string }>
}

export default async function PracticePage({ searchParams }: Props) {
  const { field } = await searchParams
  const examField: ExamField = field === 'electrical' ? 'electrical' : 'mechanical'
  const subjects = examField === 'mechanical' ? MECHANICAL_SUBJECTS : ELECTRICAL_SUBJECTS
  const counts = await getQuestionCounts()

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">문제풀기</h1>
      <p className="text-gray-500 mb-6">과목을 선택해서 풀거나, 연도별 기출문제를 풀 수 있어요.</p>

      {/* 분야 탭 */}
      <div className="flex gap-2 mb-6">
        {(['mechanical', 'electrical'] as ExamField[]).map(f => (
          <Link
            key={f}
            href={`/practice?field=${f}`}
            className={`px-5 py-2 rounded-full text-sm font-medium transition-colors ${
              examField === f
                ? 'bg-red-600 text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:border-red-300'
            }`}
          >
            {f === 'mechanical' ? '기계분야' : '전기분야'}
          </Link>
        ))}
      </div>

      {/* 과목별 카드 */}
      <div className="space-y-3 mb-8">
        <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide">과목별 풀기</h2>
        {subjects.map(subject => {
          const count = counts[`${examField}-${subject}`] || 0
          return (
            <Link
              key={subject}
              href={`/practice/${examField}/${subject}`}
              className="flex items-center justify-between bg-white rounded-xl p-4 border border-gray-100 hover:border-red-200 hover:shadow-sm transition-all group"
            >
              <div>
                <div className="font-medium text-gray-900 group-hover:text-red-600">
                  {SUBJECT_LABELS[subject]}
                </div>
                <div className="text-sm text-gray-400">{count.toLocaleString()}문제</div>
              </div>
              <svg className="w-5 h-5 text-gray-300 group-hover:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          )
        })}
      </div>

      {/* 연도별 기출 */}
      <div className="space-y-3">
        <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide">연도별 기출</h2>
        {[2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016].map(year => (
          <Link
            key={year}
            href={`/practice/${examField}/year/${year}`}
            className="flex items-center justify-between bg-white rounded-xl p-4 border border-gray-100 hover:border-red-200 hover:shadow-sm transition-all group"
          >
            <div>
              <div className="font-medium text-gray-900 group-hover:text-red-600">
                {year}년 기출문제
              </div>
              <div className="text-sm text-gray-400">1회 · 2회 · 4회</div>
            </div>
            <svg className="w-5 h-5 text-gray-300 group-hover:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        ))}
      </div>
    </div>
  )
}
