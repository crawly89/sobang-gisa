import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createClient as createClientAdmin } from '@supabase/supabase-js'
import type { ExamField, Subject } from '@/types'
import QuestionPracticeClient from './QuestionPracticeClient'

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

interface Props {
  params: Promise<{
    field: ExamField
    subject: Subject
  }>
}

async function getQuestions(field: ExamField, subject: Subject) {
  const supabase = await createClient()

  // 관리자 검수 완료된 문제만 가져오기
  const { data, error } = await supabase
    .from('questions')
    .select('*')
    .eq('exam_field', field)
    .eq('subject', subject)
    .eq('verified', true)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching questions:', error)
    return []
  }

  return data || []
}

export async function generateMetadata({ params }: Props) {
  const { field, subject } = await params
  return {
    title: `${SUBJECT_LABELS[subject]} - ${field === 'mechanical' ? '기계' : '전기'}분야`,
  }
}

export default async function SubjectPracticePage({ params }: Props) {
  const { field, subject } = await params

  // 유효성 검사
  const validFields: ExamField[] = ['mechanical', 'electrical']
  const validSubjects: Subject[] = [
    'fire_principles', 'fluid_mechanics', 'fire_law', 'suppression_systems',
    'alarm_evacuation', 'electrical_general', 'electrical_systems', 'hazmat'
  ]

  if (!validFields.includes(field) || !validSubjects.includes(subject)) {
    notFound()
  }

  const questions = await getQuestions(field, subject)

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {SUBJECT_LABELS[subject]}
        </h1>
        <p className="text-gray-500">
          {field === 'mechanical' ? '기계' : '전기'}분야 · 총 {questions.length}문제
        </p>
      </div>

      {questions.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
          <div className="text-4xl mb-4">📝</div>
          <p className="text-gray-500 mb-2">아직 등록된 문제가 없습니다.</p>
          <p className="text-sm text-gray-400">문제가 준비되면 알림을 보내드릴게요!</p>
        </div>
      ) : (
        <QuestionPracticeClient questions={questions} />
      )}
    </div>
  )
}
