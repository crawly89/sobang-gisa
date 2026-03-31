'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_ITEMS = [
  { href: '/practice',   label: '문제풀기' },
  { href: '/mock-exam',  label: 'CBT 모의고사' },
  { href: '/wrong-notes', label: '오답노트' },
  { href: '/dashboard',  label: '학습통계' },
]

export default function Header() {
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* 로고 */}
        <Link href="/" className="flex items-center gap-2 font-bold text-lg">
          <span className="text-red-600">🔥</span>
          <span className="text-gray-900">소방설비기사</span>
          <span className="hidden sm:inline text-gray-400 font-normal text-sm">문제은행</span>
        </Link>

        {/* 네비게이션 */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV_ITEMS.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                pathname.startsWith(item.href)
                  ? 'bg-red-50 text-red-600'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* 우측 버튼 */}
        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="text-sm text-gray-600 hover:text-gray-900 px-3 py-1.5"
          >
            로그인
          </Link>
          <Link
            href="/signup"
            className="text-sm bg-red-600 text-white px-4 py-1.5 rounded-full hover:bg-red-700 transition-colors"
          >
            무료 시작
          </Link>
        </div>
      </div>

      {/* 모바일 하단 탭 */}
      <nav className="md:hidden flex border-t border-gray-100">
        {NAV_ITEMS.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex-1 py-2 text-center text-xs font-medium transition-colors ${
              pathname.startsWith(item.href)
                ? 'text-red-600 border-t-2 border-red-600'
                : 'text-gray-500'
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  )
}
