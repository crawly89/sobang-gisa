/**
 * 수집된 JSON 문제 데이터 → Supabase DB 임포트
 *
 * 실행: npx tsx scripts/import-to-supabase.ts --file data/raw/questions_YYYY-MM-DD.json
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'
import type { RawQnetQuestion } from '../src/types'

dotenv.config({ path: path.join(process.cwd(), '.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('[오류] .env.local에 Supabase 환경변수를 설정하세요.')
  process.exit(1)
}

// Service Role 키 사용 (RLS 우회, 서버 전용)
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

const BATCH_SIZE = 100 // 한 번에 삽입할 최대 개수

async function main() {
  // 파일 경로 파싱
  const fileArg = process.argv.find(a => a.startsWith('--file='))?.split('=')[1]
    || process.argv[process.argv.indexOf('--file') + 1]

  if (!fileArg) {
    // 파일 미지정 시 가장 최신 파일 자동 선택
    const rawDir = path.join(process.cwd(), 'data', 'raw')
    const files = fs.readdirSync(rawDir)
      .filter(f => f.startsWith('questions_') && f.endsWith('.json'))
      .sort()
      .reverse()

    if (files.length === 0) {
      console.error('[오류] data/raw/ 에 수집된 파일이 없습니다.')
      console.error('먼저 npx tsx scripts/scrape-qnet.ts 를 실행하세요.')
      process.exit(1)
    }

    console.log(`[자동 선택] 가장 최신 파일: ${files[0]}`)
    return importFile(path.join(rawDir, files[0]))
  }

  return importFile(path.resolve(fileArg))
}

async function importFile(filePath: string) {
  if (!fs.existsSync(filePath)) {
    console.error(`[오류] 파일 없음: ${filePath}`)
    process.exit(1)
  }

  console.log(`\n[임포트 시작] ${filePath}`)
  const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as RawQnetQuestion[]
  console.log(`  총 ${raw.length}개 문제 로드됨`)

  // DB 레코드로 변환
  const records = raw.map(q => ({
    exam_type:       q.examType,
    exam_field:      q.examField,
    subject:         q.subject,
    year:            q.year,
    round:           q.round,
    question_number: q.questionNumber,
    question_text:   q.questionText,
    option_a:        q.options[0],
    option_b:        q.options[1],
    option_c:        q.options[2],
    option_d:        q.options[3],
    answer:          q.answer,
    source:          'qnet_official' as const,
    verified:        false,  // 관리자 검수 후 true로 변경
  }))

  // 배치 삽입 (중복 upsert: 같은 연도/회차/번호면 업데이트)
  let inserted = 0
  let failed = 0

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE)

    const { error } = await supabase
      .from('questions')
      .upsert(batch, {
        onConflict: 'exam_type,exam_field,year,round,question_number',
        ignoreDuplicates: false,
      })

    if (error) {
      console.error(`  [오류] 배치 ${Math.floor(i / BATCH_SIZE) + 1}:`, error.message)
      failed += batch.length
    } else {
      inserted += batch.length
      process.stdout.write(`\r  진행: ${inserted + failed}/${records.length}`)
    }
  }

  console.log(`\n\n[완료]`)
  console.log(`  성공: ${inserted}개`)
  console.log(`  실패: ${failed}개`)
  console.log('\n다음 단계: Supabase 대시보드 → Table Editor → questions 에서 확인 후')
  console.log('verified = true 로 일괄 업데이트하세요.')
}

main().catch(console.error)
