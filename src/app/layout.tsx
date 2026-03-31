import type { Metadata } from 'next'
import { Noto_Sans_KR } from 'next/font/google'
import './globals.css'

const notoSansKr = Noto_Sans_KR({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-noto',
})

export const metadata: Metadata = {
  title: {
    default: '소방설비기사 문제은행',
    template: '%s | 소방설비기사 문제은행',
  },
  description: '소방설비기사(기계/전기) 최다 문제 + CBT 모의고사. AI 기반 취약점 분석으로 합격까지.',
  keywords: ['소방설비기사', '소방설비산업기사', '기출문제', 'CBT', '모의고사', '문제풀이'],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={`${notoSansKr.variable} h-full`}>
      <body className="min-h-full flex flex-col bg-gray-50 font-sans antialiased">
        {children}
      </body>
    </html>
  )
}
