/**
 * 법제처 API + Claude API → 소방 관련 법령 기반 문제 자동 생성
 *
 * 실행: npx tsx scripts/generate-questions.ts
 * 옵션: --law 소방기본법 --count 50 --dry-run
 */

import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'
import type { Subject, ExamField } from '../src/types'

dotenv.config({ path: path.join(process.cwd(), '.env.local') })

// ============================================================
// 설정
// ============================================================

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY!
const LAW_API_KEY = process.env.LAW_API_KEY!

const LAW_API_BASE = 'https://open.law.go.kr/LSO'

// 소방 관련 법령 목록 (법제처 검색용)
const FIRE_LAWS = [
  { name: '소방기본법',                    subject: 'fire_law' as Subject },
  { name: '소방시설 설치 및 관리에 관한 법률', subject: 'fire_law' as Subject },
  { name: '소방시설공사업법',               subject: 'fire_law' as Subject },
  { name: '화재의 예방 및 안전관리에 관한 법률', subject: 'fire_law' as Subject },
  { name: '위험물안전관리법',               subject: 'hazmat' as Subject },
]

const isDryRun = process.argv.includes('--dry-run')
const targetLawArg = process.argv.find(a => a.startsWith('--law='))?.split('=')[1]
const countArg = parseInt(process.argv.find(a => a.startsWith('--count='))?.split('=')[1] || '10')

// ============================================================
// 타입
// ============================================================

interface GeneratedQuestion {
  question_text: string
  option_a: string
  option_b: string
  option_c: string
  option_d: string
  answer: 1 | 2 | 3 | 4
  explanation: string
  law_reference: string
  subject: Subject
  difficulty: 1 | 2 | 3 | 4 | 5
}

interface LawArticle {
  lawName: string
  articleNo: string
  clauseNo: string | null
  content: string
  subject: Subject
}

// ============================================================
// 법제처 API
// ============================================================

async function fetchLawList(lawName: string): Promise<string | null> {
  const url = new URL(`${LAW_API_BASE}/search/getLawSrchList.do`)
  url.searchParams.set('OC', LAW_API_KEY)
  url.searchParams.set('target', 'law')
  url.searchParams.set('type', 'XML')
  url.searchParams.set('query', lawName)

  try {
    const res = await fetch(url.toString())
    const xml = await res.text()

    // XML에서 법령 MST ID 추출
    const match = xml.match(/<법령ID>(\d+)<\/법령ID>/)
    return match?.[1] || null
  } catch (e) {
    console.error(`  [오류] 법령 목록 조회 실패 (${lawName}):`, e)
    return null
  }
}

async function fetchLawArticles(lawName: string, lawId: string): Promise<LawArticle[]> {
  const url = new URL(`${LAW_API_BASE}/search/getLawSrch.do`)
  url.searchParams.set('OC', LAW_API_KEY)
  url.searchParams.set('target', 'law')
  url.searchParams.set('type', 'XML')
  url.searchParams.set('ID', lawId)

  try {
    const res = await fetch(url.toString())
    const xml = await res.text()

    const articles: LawArticle[] = []

    // 조문 내용 파싱 (간략화된 XML 파서)
    const articleMatches = xml.matchAll(
      /<조문번호>(.*?)<\/조문번호>[\s\S]*?<조문내용>([\s\S]*?)<\/조문내용>/g
    )

    const subject = FIRE_LAWS.find(l => l.name === lawName)?.subject || 'fire_law'

    for (const m of articleMatches) {
      const articleNo = m[1].trim()
      const rawContent = m[2].replace(/<[^>]+>/g, '').trim()

      // 수치/기준이 포함된 조문만 선택 (출제 가치 높음)
      const hasNumbers = /\d+/.test(rawContent)
      const isTooShort = rawContent.length < 30

      if (isTooShort) continue
      if (!hasNumbers && rawContent.length < 100) continue

      articles.push({
        lawName,
        articleNo,
        clauseNo: null,
        content: rawContent.slice(0, 800), // 토큰 절약
        subject,
      })
    }

    return articles
  } catch (e) {
    console.error(`  [오류] 법령 조문 조회 실패 (${lawName}):`, e)
    return []
  }
}

// ============================================================
// Claude API 문제 생성
// ============================================================

const SYSTEM_PROMPT = `당신은 한국 소방설비기사/소방설비산업기사 필기시험 출제위원입니다.
실제 큐넷(Q-net) 시험과 동일한 스타일로 4지선다 문제를 생성하세요.

출제 규칙:
1. 정답은 1~4번 중 하나이며, 4개 문제 세트에서 골고루 분포
2. 오답 선지는 실제 시험의 전형적인 함정 패턴 사용:
   - 수치를 ±20~50% 변형
   - 유사 법령 용어 혼용
   - 조건/예외 조항 뒤바꾸기
3. 해설은 정답 근거와 오답 이유를 간결하게 설명
4. 반드시 아래 JSON 형식으로만 출력 (다른 텍스트 없이)`

async function generateQuestionsFromArticle(
  client: Anthropic,
  article: LawArticle,
  count: number = 3
): Promise<GeneratedQuestion[]> {
  const prompt = `다음 법령 조문을 바탕으로 소방설비기사 4지선다 문제 ${count}개를 생성하세요.

[법령명] ${article.lawName} ${article.articleNo}
[조문내용]
${article.content}

JSON 배열로 출력하세요:
[
  {
    "question_text": "문제 내용",
    "option_a": "① 보기1",
    "option_b": "② 보기2",
    "option_c": "③ 보기3",
    "option_d": "④ 보기4",
    "answer": 정답번호(1~4),
    "explanation": "정답 해설 및 오답 이유",
    "law_reference": "${article.lawName} ${article.articleNo}",
    "difficulty": 난이도(1~5)
  }
]`

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001', // 비용 최소화
      max_tokens: 2000,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
    })

    const rawText = response.content[0].type === 'text' ? response.content[0].text : ''

    // JSON 추출 (마크다운 코드블록 처리)
    const jsonMatch = rawText.match(/\[[\s\S]*\]/)
    if (!jsonMatch) return []

    const parsed = JSON.parse(jsonMatch[0]) as Array<{
      question_text: string
      option_a: string
      option_b: string
      option_c: string
      option_d: string
      answer: number
      explanation: string
      law_reference: string
      difficulty: number
    }>

    return parsed.map(q => ({
      ...q,
      answer: (Math.min(Math.max(q.answer, 1), 4)) as 1 | 2 | 3 | 4,
      difficulty: (Math.min(Math.max(q.difficulty || 3, 1), 5)) as 1 | 2 | 3 | 4 | 5,
      subject: article.subject,
    }))
  } catch (e) {
    console.warn(`  [경고] 문제 생성 실패 (${article.articleNo}):`, (e as Error).message)
    return []
  }
}

// ============================================================
// Supabase 저장
// ============================================================

async function saveToSupabase(
  supabase: ReturnType<typeof createClient>,
  questions: GeneratedQuestion[],
  examField: ExamField
) {
  const records = questions.map(q => ({
    exam_type: 'engineer' as const,
    exam_field: examField,
    subject: q.subject,
    year: null,
    round: null,
    question_text: q.question_text,
    option_a: q.option_a,
    option_b: q.option_b,
    option_c: q.option_c,
    option_d: q.option_d,
    answer: q.answer,
    explanation: q.explanation,
    law_reference: q.law_reference,
    source: 'ai_generated' as const,
    difficulty: q.difficulty,
    verified: false,
  }))

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from('questions').insert(records)
  if (error) throw error
  return records.length
}

// ============================================================
// 메인
// ============================================================

async function main() {
  console.log('========================================')
  console.log('  Claude API 문제 자동 생성')
  if (isDryRun) console.log('  [DRY RUN] DB 저장 없이 미리보기만')
  console.log('========================================\n')

  if (!ANTHROPIC_API_KEY) {
    console.error('[오류] ANTHROPIC_API_KEY를 .env.local에 설정하세요.')
    process.exit(1)
  }

  const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY })
  const supabase = !isDryRun
    ? createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
    : null

  const targetLaws = targetLawArg
    ? FIRE_LAWS.filter(l => l.name.includes(targetLawArg))
    : FIRE_LAWS

  if (targetLaws.length === 0) {
    console.error(`[오류] 일치하는 법령 없음: ${targetLawArg}`)
    console.error('사용 가능:', FIRE_LAWS.map(l => l.name).join(', '))
    process.exit(1)
  }

  const allGenerated: GeneratedQuestion[] = []

  for (const law of targetLaws) {
    console.log(`\n[처리] ${law.name}`)

    // 법령 ID 조회 (API 키 없으면 샘플 데이터로 테스트)
    let articles: LawArticle[] = []

    if (LAW_API_KEY && LAW_API_KEY !== 'your_law_api_key') {
      const lawId = await fetchLawList(law.name)
      if (!lawId) {
        console.warn(`  [건너뜀] 법령 ID 조회 실패`)
        continue
      }
      articles = await fetchLawArticles(law.name, lawId)
    } else {
      // API 키 없을 때 샘플 조문으로 테스트
      console.warn('  [주의] LAW_API_KEY 미설정 — 샘플 조문으로 테스트')
      articles = getSampleArticles(law.name, law.subject)
    }

    console.log(`  → ${articles.length}개 조문 로드`)

    // 조문당 문제 생성 (목표 개수에 도달할 때까지)
    let generated = 0
    for (const article of articles) {
      if (generated >= countArg) break

      const remaining = countArg - generated
      const batchCount = Math.min(3, remaining)

      const questions = await generateQuestionsFromArticle(anthropic, article, batchCount)
      allGenerated.push(...questions)
      generated += questions.length

      if (questions.length > 0) {
        console.log(`  ${article.articleNo}: ${questions.length}개 생성`)
        if (isDryRun && questions[0]) {
          console.log(`    Q: ${questions[0].question_text.slice(0, 60)}...`)
          console.log(`    A: ${questions[0].answer}번 (${['①','②','③','④'][questions[0].answer - 1]})`)
        }
      }

      // API 레이트 리밋 방지
      await new Promise(r => setTimeout(r, 500))
    }

    console.log(`  → 총 ${generated}개 생성 완료`)
  }

  // 저장 또는 미리보기
  if (!isDryRun && supabase && allGenerated.length > 0) {
    console.log(`\n[저장] Supabase에 ${allGenerated.length}개 문제 저장 중...`)
    // 법령 관련 문제는 기계/전기 공통 (소방관계법규 과목)
    const saved = await saveToSupabase(supabase, allGenerated, 'mechanical')
    await saveToSupabase(supabase, allGenerated, 'electrical')
    console.log(`  → 기계: ${saved}개, 전기: ${saved}개 저장 완료`)
  }

  // 결과 파일로도 저장
  const outPath = path.join(process.cwd(), 'data', 'raw', `ai_questions_${Date.now()}.json`)
  fs.mkdirSync(path.dirname(outPath), { recursive: true })
  fs.writeFileSync(outPath, JSON.stringify(allGenerated, null, 2), 'utf-8')
  console.log(`\n[결과] ${outPath}`)
  console.log(`총 생성: ${allGenerated.length}개 문제`)
}

// 법제처 API 키 없을 때 사용하는 샘플 조문
function getSampleArticles(lawName: string, subject: Subject): LawArticle[] {
  return [
    {
      lawName,
      articleNo: '제9조',
      clauseNo: '제1항',
      content: `소방청장, 소방본부장 또는 소방서장은 화재, 재난·재해, 그 밖의 위급한 상황이 발생한 경우 소방대를 현장에 신속하게 출동시켜 화재진압과 인명구조·구급 등 소방에 필요한 활동을 하게 해야 한다. 소방자동차의 우선통행권은 소방자동차가 화재진압 및 구조·구급 활동을 위하여 출동할 때 모든 차와 사람은 이에 진로를 양보하여야 한다.`,
      subject,
    },
    {
      lawName,
      articleNo: '제16조',
      clauseNo: null,
      content: `소방대상물의 소유자·관리자 또는 점유자는 소방대상물에 설치된 소방시설 등이 화재안전기준에 따라 설치·관리되도록 하여야 한다. 스프링클러설비의 헤드는 바닥으로부터 높이가 0.6m 이상 1.8m 이하인 장소에 설치하되, 설치 간격은 2.3m 이하로 한다.`,
      subject,
    },
    {
      lawName,
      articleNo: '제22조',
      clauseNo: '제3항',
      content: `소화기의 설치 기준은 다음 각 호와 같다. 1. 각 층마다 설치하되, 특정소방대상물의 각 부분으로부터 하나의 소화기까지의 보행거리가 소형소화기의 경우 20m 이하, 대형소화기의 경우 30m 이하가 되도록 배치할 것. 2. 소화기는 바닥으로부터 높이 1.5m 이하의 곳에 비치할 것.`,
      subject,
    },
  ]
}

main().catch(console.error)
