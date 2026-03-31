/**
 * 큐넷 페이지 구조 탐색 스크립트
 *
 * 본격 스크래핑 전에 실행해서 실제 DOM 구조를 파악합니다.
 * 탐색 결과를 보고 scrape-qnet.ts의 셀렉터를 수정하세요.
 *
 * 실행: npx tsx scripts/inspect-qnet.ts
 */

import { chromium } from 'playwright'
import * as fs from 'fs'
import * as path from 'path'

const QNET_BASE = 'https://www.q-net.or.kr'

// 소방설비기사(기계) 종목 코드 — 실제 코드는 탐색으로 확인
const TARGET_URLS = [
  // 기출문제 메인 메뉴
  `${QNET_BASE}/crf005.do?id=crf00505&gSite=Q&gId=`,
  // 자격증 검색 페이지
  `${QNET_BASE}/crf005.do?id=crf00101&gSite=Q`,
]

async function main() {
  const browser = await chromium.launch({ headless: false }) // 눈으로 확인하기 위해 headless: false
  const page = await browser.newPage()

  const results: Record<string, unknown> = {}

  for (const url of TARGET_URLS) {
    console.log(`\n탐색 중: ${url}`)
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 })
      await page.waitForTimeout(2000)

      const info = await page.evaluate(() => {
        // 1. 모든 링크에서 소방 관련 href 수집
        const fireLinks = Array.from(document.querySelectorAll('a'))
          .filter(a => {
            const text = a.textContent || ''
            const href = a.href || ''
            return text.includes('소방') || href.includes('소방') || href.includes('1320') || href.includes('1321')
          })
          .map(a => ({ text: a.textContent?.trim(), href: a.href, onclick: a.getAttribute('onclick') }))
          .slice(0, 20)

        // 2. 테이블 구조 파악
        const tables = Array.from(document.querySelectorAll('table')).map((table, i) => {
          const headers = Array.from(table.querySelectorAll('th')).map(th => th.textContent?.trim())
          const firstRow = Array.from(table.querySelectorAll('tbody tr:first-child td')).map(td => td.textContent?.trim())
          return { tableIndex: i, headers, firstRow }
        })

        // 3. select/option에서 자격증 목록 찾기
        const selects = Array.from(document.querySelectorAll('select')).map(sel => {
          const fireOptions = Array.from(sel.options)
            .filter(o => o.text.includes('소방'))
            .map(o => ({ value: o.value, text: o.text }))
          return { name: sel.name || sel.id, fireOptions }
        }).filter(s => s.fireOptions.length > 0)

        // 4. form action 파악
        const forms = Array.from(document.querySelectorAll('form')).map(f => ({
          action: f.action,
          method: f.method,
          id: f.id,
        }))

        return { fireLinks, tables, selects, forms, title: document.title }
      })

      results[url] = info

      console.log('\n  [소방 관련 링크]')
      ;(info.fireLinks as any[]).forEach(l =>
        console.log(`    텍스트: "${l.text}" | href: ${l.href} | onclick: ${l.onclick}`)
      )

      console.log('\n  [테이블 구조]')
      ;(info.tables as any[]).forEach(t => {
        console.log(`    테이블 ${t.tableIndex}: 헤더=${t.headers?.join(', ')} | 첫행=${t.firstRow?.join(', ')}`)
      })

      console.log('\n  [Select에서 소방 옵션]')
      ;(info.selects as any[]).forEach(s => {
        console.log(`    select[${s.name}]:`, s.fireOptions)
      })

    } catch (e) {
      console.error(`  오류:`, e)
      results[url] = { error: String(e) }
    }
  }

  // 결과 저장
  const outPath = path.join(process.cwd(), 'data', 'raw', 'qnet_structure.json')
  fs.mkdirSync(path.dirname(outPath), { recursive: true })
  fs.writeFileSync(outPath, JSON.stringify(results, null, 2), 'utf-8')
  console.log(`\n[저장] 탐색 결과 → ${outPath}`)
  console.log('\n브라우저를 닫으려면 아무 키나 누르세요...')

  // 잠시 열어두어서 직접 확인 가능하게
  await page.waitForTimeout(10000)
  await browser.close()
}

main().catch(console.error)
