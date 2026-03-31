/**
 * 소방설비기사 정확한 종목 코드 탐색
 * 실행: npx tsx scripts/find-exam-code.ts
 */

import { chromium } from 'playwright'

async function main() {
  const browser = await chromium.launch({ headless: false }) // 눈으로 확인
  const page = await browser.newPage()

  console.log('큐넷 기출문제 페이지 탐색 중...\n')

  // 기출문제 메인 페이지
  await page.goto('https://www.q-net.or.kr/crf005.do?id=crf00505&gSite=Q&gId=', {
    waitUntil: 'networkidle', timeout: 30000
  })
  await page.waitForTimeout(2000)

  // 1단계: "법률.경찰.소방.교도.국방" 클릭
  console.log('[1단계] 법률.경찰.소방.교도.국방 클릭...')
  await page.evaluate(() => {
    // @ts-ignore
    step2JikMu('1','4','05', 'T')
  })
  await page.waitForTimeout(2000)

  // 2단계: 소방청 링크 찾기
  const links2 = await page.$$eval('a', links =>
    links
      .filter(a => a.textContent?.includes('소방'))
      .map(a => ({
        text: a.textContent?.trim(),
        onclick: a.getAttribute('onclick'),
        href: a.getAttribute('href'),
      }))
  )
  console.log('[2단계] 소방 관련 링크:')
  links2.forEach(l => console.log(`  "${l.text}" onclick="${l.onclick}" href="${l.href}"`))

  // 3단계: 소방청 클릭 (첫 번째)
  try {
    const sobanghcheong = links2.find(l =>
      l.text === '소방청' && l.onclick
    )
    if (sobanghcheong?.onclick) {
      console.log(`\n[3단계] 소방청 클릭: ${sobanghcheong.onclick}`)
      await page.evaluate((onclick) => {
        // @ts-ignore
        eval(onclick)
      }, sobanghcheong.onclick)
      await page.waitForTimeout(2000)
    }
  } catch (e) {
    console.log('  소방청 클릭 실패:', e)
  }

  // 4단계: 소방설비기사 찾기
  const links3 = await page.$$eval('a', links =>
    links
      .filter(a => a.textContent?.includes('소방설비기사'))
      .map(a => ({
        text: a.textContent?.trim(),
        onclick: a.getAttribute('onclick'),
        href: a.getAttribute('href'),
      }))
  )
  console.log('\n[4단계] 소방설비기사 링크:')
  links3.forEach(l => console.log(`  "${l.text}" onclick="${l.onclick}" href="${l.href}"`))

  // 5단계: 소방설비기사(기계) 클릭해서 jmCd 파악
  if (links3.length > 0) {
    const mechanical = links3.find(l => l.text?.includes('기계')) || links3[0]
    if (mechanical) {
      console.log(`\n[5단계] "${mechanical.text}" 클릭...`)

      // 네트워크 요청 모니터링
      const requests: string[] = []
      page.on('request', req => {
        if (req.url().includes('crf005') || req.url().includes('jmCd')) {
          requests.push(req.url())
        }
      })

      if (mechanical.onclick) {
        await page.evaluate((onclick) => { eval(onclick) }, mechanical.onclick)
      } else if (mechanical.href) {
        await page.goto(mechanical.href.startsWith('http')
          ? mechanical.href
          : `https://www.q-net.or.kr${mechanical.href}`)
      }
      await page.waitForTimeout(3000)

      console.log('\n[네트워크 요청에서 발견된 URL:]')
      requests.forEach(r => console.log(`  ${r}`))

      // 현재 URL 확인
      console.log('\n[현재 URL]:', page.url())

      // 시험 목록 테이블 확인
      const tableData = await page.$$eval('table tbody tr', rows =>
        rows.slice(0, 5).map(row => {
          const cells = Array.from(row.querySelectorAll('td'))
          const link = row.querySelector('a')
          return {
            cells: cells.map(c => c.textContent?.trim()),
            href: link?.getAttribute('href'),
            onclick: link?.getAttribute('onclick'),
          }
        })
      )
      console.log('\n[시험 목록 테이블 (처음 5행)]:')
      tableData.forEach(r => console.log(`  ${JSON.stringify(r)}`))
    }
  }

  // 결과 저장
  const result = {
    url: page.url(),
    links2,
    links3,
  }

  const fs = await import('fs')
  fs.writeFileSync(
    'data/raw/exam_code_search.json',
    JSON.stringify(result, null, 2)
  )
  console.log('\n결과 저장: data/raw/exam_code_search.json')

  await page.waitForTimeout(5000)
  await browser.close()
}

main().catch(console.error)
