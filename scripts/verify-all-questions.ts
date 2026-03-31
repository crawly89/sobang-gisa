/**
 * Supabase에서 직접 실행하여 문제 일괄 승인
 * 실행: npx tsx scripts/verify-all-questions.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.join(process.cwd(), '.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

async function main() {
  console.log('========================================')
  console.log('  문제 일괄 승인 스크립트')
  console.log('========================================\n')

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

  // 1. 현재 검수 대기 중인 문제 수 확인
  const { count: unverifiedCount, error: countError } = await supabase
    .from('questions')
    .select('*', { count: 'exact', head: true })
    .eq('verified', false)

  if (countError) {
    console.error('[오류] 문제 수 조회 실패:', countError)
    process.exit(1)
  }

  console.log(`[확인] 검수 대기 중인 문제: ${unverifiedCount}개`)

  if (unverifiedCount === 0) {
    console.log('\n✅ 승인할 문제가 없습니다.')
    process.exit(0)
  }

  // 2. 샘플 문제 미리보기 (상위 3개)
  const { data: sampleQuestions } = await supabase
    .from('questions')
    .select('id, question_text, subject, exam_field')
    .eq('verified', false)
    .limit(3)

  if (sampleQuestions && sampleQuestions.length > 0) {
    console.log('\n[미리보기] 샘플 문제:')
    sampleQuestions.forEach((q, idx) => {
      console.log(`  ${idx + 1}. [${q.exam_field}] ${q.subject}: ${q.question_text.slice(0, 60)}...`)
    })
  }

  // 3. 일괄 승인
  console.log(`\n[진행] ${unverifiedCount}개 문제를 일괄 승인합니다...`)

  const { data, error } = await supabase
    .from('questions')
    .update({ verified: true })
    .eq('verified', false)
    .select('id')

  if (error) {
    console.error('[오류] 일괄 승인 실패:', error)
    process.exit(1)
  }

  console.log(`\n✅ 성공! ${data?.length || 0}개 문제를 승인했습니다.`)

  // 4. 승인 후 확인
  const { count: remainingCount } = await supabase
    .from('questions')
    .select('*', { count: 'exact', head: true })
    .eq('verified', false)

  console.log(`[확인] 남은 검수 대기 문제: ${remainingCount || 0}개`)
  console.log('\n========================================')
}

main().catch(console.error)
