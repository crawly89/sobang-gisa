import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import CbtExamClient from './CbtExamClient'
import type { ExamField } from '@/types'

interface Props {
  params: Promise<{ field: string }>
}

export default async function CbtExamPage({ params }: Props) {
  const { field } = await params
  if (field !== 'mechanical' && field !== 'electrical') notFound()

  const examField = field as ExamField
  const supabase = await createClient()

  // 과목별 20문제씩 무작위 추출
  const subjects = examField === 'mechanical'
    ? ['fire_principles', 'fluid_mechanics', 'fire_law', 'suppression_systems', 'alarm_evacuation']
    : ['fire_principles', 'electrical_general', 'fire_law', 'electrical_systems', 'hazmat']

  const allQuestions = []

  for (const subject of subjects) {
    const { data } = await supabase
      .from('questions')
      .select('id, question_text, option_a, option_b, option_c, option_d, subject')
      .eq('exam_field', examField)
      .eq('subject', subject)
      .eq('verified', true)
      .limit(100)

    if (!data || data.length === 0) continue

    // 무작위 20개 선택
    const shuffled = data.sort(() => Math.random() - 0.5)
    allQuestions.push(...shuffled.slice(0, 20))
  }

  if (allQuestions.length === 0) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20">
        <p className="text-gray-500">문제를 불러오는 중 오류가 발생했습니다.</p>
        <p className="text-sm text-gray-400 mt-2">잠시 후 다시 시도해주세요.</p>
      </div>
    )
  }

  return <CbtExamClient questions={allQuestions} examField={examField} />
}
