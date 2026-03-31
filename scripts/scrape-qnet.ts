/**
 * 큐넷(Q-net) 소방설비기사 기출문제 수집 스크립트
 *
 * 실행: npx tsx scripts/scrape-qnet.ts
 * 결과: data/raw/questions_YYYY-MM-DD.json
 */

import { chromium, type Page } from 'playwright'
import * as fs from 'fs'
import * as path from 'path'
import type { RawQnetQuestion, ExamField, Subject } from '../src/types'

// ============================================================
// 상수
// ============================================================

const BASE_URL = 'https://www.q-net.or.kr'
const EXAM_LIST_URL = `${BASE_URL}/crf005.do?id=crf00505&gSite=Q&gId=`

// 소방설비기사 종목 코드 (탐색으로 확인된 값)
// 기계: jmCd=1320, 전기: jmCd=1321 (추정값, 탐색으로 검증 필요)
const EXAM_TARGETS: Array<{ field: ExamField; keyword: string }> = [
  { field: 'mechanical', keyword: '소방설비기사(기계분야)' },
  { field: 'electrical', keyword: '소방설비기사(전기분야)' },
]

// 과목 매핑 (문제 번호 기준: 1~20, 21~40, ...)
const SUBJECT_MAP: Record<ExamField, Record<number, Subject>> = {
  mechanical: {
    1: 'fire_principles',
    2: 'fluid_mechanics',
    3: 'fire_law',
    4: 'suppression_systems',
    5: 'alarm_evacuation',
  },
  electrical: {
    1: 'fire_principles',
    2: 'electrical_general',
    3: 'fire_law',
    4: 'electrical_systems',
    5: 'hazmat',
  },
}

// ============================================================
// 유틸
// ============================================================

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

function getSubjectByNumber(questionNum: number, examField: ExamField): Subject {
  const subjectNum = Math.ceil(questionNum / 20)
  return SUBJECT_MAP[examField][subjectNum] ?? 'fire_principles'
}

function saveProgress(questions: RawQnetQuestion[], suffix = '') {
  const date = new Date().toISOString().split('T')[0]
  const dir = path.join(process.cwd(), 'data', 'raw')
  fs.mkdirSync(dir, { recursive: true })
  const filePath = path.join(dir, `questions_${date}${suffix}.json`)
  fs.writeFileSync(filePath, JSON.stringify(questions, null, 2), 'utf-8')
  console.log(`  [저장] → ${filePath}`)
  return filePath
}

// ============================================================
// Step 1: 종목별 시험 목록 URL 수집
// ============================================================

async function getExamUrls(
  page: Page,
  target: { field: ExamField; keyword: string }
): Promise<Array<{ year: number; round: number; url: string }>> {

  console.log(`\n[${target.field}] "${target.keyword}" 시험 목록 탐색...`)
  await page.goto(EXAM_LIST_URL, { waitUntil: 'networkidle', timeout: 30000 })
  await sleep(1500)

  // 1단계: 직무분야 "법률.경찰.소방.교도.국방" 선택
  try {
    await page.click('text=법률.경찰.소방.교도.국방', { timeout: 5000 })
    await sleep(1000)
  } catch {
    // onclick으로 시도
    await page.evaluate(() => {
      // @ts-ignore
      if (typeof step2JikMu === 'function') step2JikMu('1', '4', '05', 'T')
    })
    await sleep(1000)
  }

  // 2단계: 소방설비기사 찾기 및 클릭
  try {
    const examLink = page.locator(`text="${target.keyword}"`).first()
    await examLink.waitFor({ timeout: 5000 })
    await examLink.click()
    await sleep(1500)
  } catch {
    console.warn(`  [경고] "${target.keyword}" 링크를 찾을 수 없음`)
    return []
  }

  // 3단계: 시험 년도/회차 목록 수집
  const exams: Array<{ year: number; round: number; url: string }> = []

  try {
    await page.waitForSelector('table', { timeout: 10000 })

    const rows = await page.$$eval('table tbody tr', (rows) =>
      rows.map(row => {
        const cells = Array.from(row.querySelectorAll('td'))
        const link = row.querySelector('a')
        return {
          text0: cells[0]?.textContent?.trim() ?? '',
          text1: cells[1]?.textContent?.trim() ?? '',
          href: link?.getAttribute('href') ?? '',
          onclick: link?.getAttribute('onclick') ?? '',
        }
      })
    )

    for (const row of rows) {
      const year = parseInt(row.text0)
      const roundText = row.text1
      const round = parseInt(roundText)

      if (isNaN(year) || year < 2016) continue

      // href 또는 onclick에서 URL/파라미터 추출
      let examUrl = ''
      if (row.href && row.href !== '#' && row.href !== '#none') {
        examUrl = row.href.startsWith('http') ? row.href : `${BASE_URL}${row.href}`
      } else if (row.onclick) {
        // onclick="goDetail('xxx')" 패턴에서 ID 추출
        const idMatch = row.onclick.match(/['"]([^'"]+)['"]/)
        if (idMatch) {
          examUrl = `${BASE_URL}/crf005.do?id=crf00505a&gSite=Q&examCd=${idMatch[1]}`
        }
      }

      if (examUrl) {
        exams.push({ year, round: isNaN(round) ? 1 : round, url: examUrl })
      }
    }

    console.log(`  → ${exams.length}개 시험 발견`)
  } catch (e) {
    console.warn('  [경고] 시험 목록 파싱 실패:', (e as Error).message)
  }

  return exams
}

// ============================================================
// Step 2: 개별 시험 문제 파싱
// ============================================================

async function scrapeExamQuestions(
  page: Page,
  examField: ExamField,
  year: number,
  round: number,
  url: string
): Promise<RawQnetQuestion[]> {

  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 })
    await sleep(1500)

    // 큐넷 기출문제 페이지의 실제 구조 파싱
    const raw = await page.evaluate(() => {
      const questions: Array<{
        num: string
        text: string
        options: string[]
        answer: string
      }> = []

      // 가능한 문제 컨테이너 셀렉터들
      const containers = document.querySelectorAll(
        '.q_wrap, .question_wrap, .exam_wrap, [class*="question"], .q-area'
      )

      if (containers.length > 0) {
        containers.forEach(container => {
          const numEl = container.querySelector('.q_num, .num, [class*="num"]')
          const textEl = container.querySelector('.q_txt, .question, [class*="txt"], [class*="text"]')
          const optionEls = container.querySelectorAll('.q_opt li, .option li, [class*="opt"] li, ol li')
          const answerEl = container.querySelector('.answer, [class*="answer"], .q_ans')

          const num = numEl?.textContent?.replace(/[^\d]/g, '').trim() ?? ''
          const text = textEl?.textContent?.trim() ?? ''
          const options = Array.from(optionEls).map(o => o.textContent?.trim() ?? '')
          const answer = answerEl?.textContent?.replace(/[^\d]/g, '').trim() ?? ''

          if (num && text && options.length >= 4) {
            questions.push({ num, text, options, answer })
          }
        })
      }

      // 대안: 테이블 구조
      if (questions.length === 0) {
        document.querySelectorAll('table tr').forEach(row => {
          const cells = Array.from(row.querySelectorAll('td'))
          if (cells.length >= 3) {
            const num = cells[0]?.textContent?.replace(/[^\d]/g, '').trim()
            const text = cells[1]?.textContent?.trim()
            if (num && text && parseInt(num) >= 1 && parseInt(num) <= 100) {
              questions.push({
                num,
                text,
                options: Array.from(cells[2]?.querySelectorAll('li') ?? [])
                  .map(li => li.textContent?.trim() ?? ''),
                answer: cells[3]?.textContent?.replace(/[^\d]/g, '').trim() ?? '',
              })
            }
          }
        })
      }

      return questions
    })

    const questions: RawQnetQuestion[] = []

    for (const q of raw) {
      const qNum = parseInt(q.num)
      if (isNaN(qNum) || qNum < 1 || qNum > 100) continue
      if (q.options.length < 4) continue

      const answerNum = parseInt(q.answer) as 1 | 2 | 3 | 4
      if (answerNum < 1 || answerNum > 4) continue

      questions.push({
        examType: 'engineer',
        examField,
        subject: getSubjectByNumber(qNum, examField),
        year,
        round,
        questionNumber: qNum,
        questionText: q.text,
        options: [q.options[0], q.options[1], q.options[2], q.options[3]],
        answer: answerNum,
      })
    }

    return questions

  } catch (e) {
    console.warn(`  [경고] ${year}년 ${round}회 파싱 실패:`, (e as Error).message)
    return []
  }
}

// ============================================================
// Step 3: 직접 URL 방식 (종목코드 알고 있을 때)
// ============================================================

async function scrapeByDirectUrl(page: Page): Promise<RawQnetQuestion[]> {
  const all: RawQnetQuestion[] = []

  // 큐넷 기출문제 직접 접근 URL 패턴 시도
  // jmCd=1320 (소방설비기사 기계), 1321 (전기) — 추정값
  const directTargets: Array<{ field: ExamField; jmCd: string }> = [
    { field: 'mechanical', jmCd: '1320' },
    { field: 'electrical', jmCd: '1321' },
  ]

  for (const target of directTargets) {
    const url = `${BASE_URL}/crf005.do?id=crf00505&gSite=Q&gId=&jmCd=${target.jmCd}`
    console.log(`\n[직접 URL] ${target.field}: ${url}`)

    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 })
    await sleep(2000)

    // 페이지 제목으로 올바른 페이지인지 확인
    const title = await page.title()
    const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 500))
    console.log(`  페이지 제목: ${title}`)
    console.log(`  내용 미리보기: ${bodyText.slice(0, 200)}`)

    // 시험 목록 파싱
    const examLinks = await page.$$eval(
      'a[onclick], table a, .list_table a',
      (links) => links.map(a => ({
        text: a.textContent?.trim() ?? '',
        href: a.getAttribute('href') ?? '',
        onclick: a.getAttribute('onclick') ?? '',
      })).filter(l => /\d{4}/.test(l.text) || l.href.includes('examCd'))
    )

    console.log(`  시험 링크 발견: ${examLinks.length}개`)
    examLinks.slice(0, 5).forEach(l =>
      console.log(`    - "${l.text}" | onclick: ${l.onclick} | href: ${l.href}`)
    )
  }

  return all
}

// ============================================================
// 메인
// ============================================================

async function main() {
  console.log('========================================')
  console.log('  큐넷 소방설비기사 기출문제 수집')
  console.log('========================================')

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox'],
  })
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    locale: 'ko-KR',
  })
  const page = await context.newPage()

  const allQuestions: RawQnetQuestion[] = []

  try {
    // 방법 1: UI 클릭 방식으로 시험 목록 수집
    for (const target of EXAM_TARGETS) {
      const exams = await getExamUrls(page, target)

      for (const exam of exams) {
        process.stdout.write(`  ${exam.year}년 ${exam.round}회차 수집 중...`)
        const qs = await scrapeExamQuestions(page, target.field, exam.year, exam.round, exam.url)
        allQuestions.push(...qs)
        console.log(` ${qs.length}문제`)
        await sleep(2000)
      }

      // 중간 저장
      if (allQuestions.length > 0) {
        saveProgress(allQuestions, `_partial_${target.field}`)
      }
    }

    // 방법 1에서 수집 실패 시 방법 2: 직접 URL 방식으로 구조 탐색
    if (allQuestions.length === 0) {
      console.log('\n[방법 1 실패] 직접 URL 방식으로 재시도...')
      await scrapeByDirectUrl(page)
      console.log('\n탐색 결과를 확인하고 종목 코드를 업데이트하세요.')
    }

  } catch (e) {
    console.error('\n[오류]', e)
  } finally {
    await browser.close()
  }

  // 최종 저장
  if (allQuestions.length > 0) {
    const outPath = saveProgress(allQuestions)
    console.log(`\n수집 완료: ${allQuestions.length}문제 → ${outPath}`)
    printStats(allQuestions)
  } else {
    console.log('\n수집된 문제 없음.')
    console.log('data/raw/qnet_structure.json 확인 후 셀렉터를 수정하세요.')
  }
}

function printStats(questions: RawQnetQuestion[]) {
  const byField: Record<string, number> = {}
  const byYear: Record<string, number> = {}
  questions.forEach(q => {
    byField[q.examField] = (byField[q.examField] || 0) + 1
    const y = String(q.year)
    byYear[y] = (byYear[y] || 0) + 1
  })
  console.log('\n[분야별]')
  Object.entries(byField).forEach(([k, v]) => console.log(`  ${k}: ${v}문제`))
  console.log('\n[연도별]')
  Object.entries(byYear).sort().forEach(([k, v]) => console.log(`  ${k}: ${v}문제`))
}

main().catch(console.error)
