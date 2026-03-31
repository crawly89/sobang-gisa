import Link from 'next/link'
import Header from '@/components/Header'

const STATS = [
  { value: '15,000+', label: '문제 수' },
  { value: '기계/전기', label: '전 분야' },
  { value: 'CBT', label: '실전 모의고사' },
  { value: 'AI', label: '취약점 분석' },
]

const FEATURES = [
  {
    icon: '📚',
    title: '최다 기출 + AI 생성 문제',
    desc: '큐넷 공개 기출 + 법령 기반 AI 생성 문제로 15,000개 이상 보유. 법령 개정 시 자동 업데이트.',
  },
  {
    icon: '💻',
    title: '실제 CBT 환경 모의고사',
    desc: '실제 큐넷 CBT와 동일한 인터페이스. 120분 타이머, 50문제, 답안 수정까지 똑같이 연습.',
  },
  {
    icon: '🎯',
    title: 'AI 취약점 분석',
    desc: '내가 자주 틀리는 과목과 유형을 자동 분석. 취약한 부분만 집중 반복 학습.',
  },
  {
    icon: '📱',
    title: '언제 어디서나',
    desc: '출퇴근 시간, 점심시간 5분도 학습 가능. PC/모바일 완전 최적화.',
  },
]

const SUBJECTS_MECHANICAL = [
  '소방원론', '소방유체역학', '소방관계법규', '소화설비', '경보 및 피난설비',
]
const SUBJECTS_ELECTRICAL = [
  '소방원론', '소방전기일반', '소방관계법규', '소방전기시설의 구조 및 원리', '위험물의 성상 및 시설기준',
]

export default function LandingPage() {
  return (
    <>
      <Header />

      {/* 히어로 섹션 */}
      <section className="bg-gradient-to-br from-red-600 to-red-800 text-white">
        <div className="max-w-6xl mx-auto px-4 py-20 text-center">
          <div className="inline-block bg-red-500/40 text-red-100 text-sm font-medium px-3 py-1 rounded-full mb-6">
            소방설비기사 · 소방설비산업기사
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">
            합격까지 가장 빠른 길,<br />
            <span className="text-yellow-300">소방 문제은행</span>
          </h1>
          <p className="text-red-100 text-lg mb-10 max-w-xl mx-auto">
            15,000문제 + 실제 CBT 모의고사 + AI 취약점 분석<br />
            기계분야 · 전기분야 전 과목 완벽 커버
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/practice"
              className="bg-white text-red-600 font-bold px-8 py-3 rounded-full hover:bg-red-50 transition-colors text-lg"
            >
              무료로 시작하기
            </Link>
            <Link
              href="/mock-exam"
              className="bg-red-500/40 text-white font-medium px-8 py-3 rounded-full hover:bg-red-500/60 transition-colors text-lg border border-red-400"
            >
              CBT 모의고사 체험
            </Link>
          </div>
        </div>
      </section>

      {/* 통계 */}
      <section className="bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 py-8 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {STATS.map(s => (
            <div key={s.label}>
              <div className="text-2xl font-bold text-red-600">{s.value}</div>
              <div className="text-sm text-gray-500 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* 기능 소개 */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <h2 className="text-2xl font-bold text-center text-gray-900 mb-10">
          왜 소방 문제은행인가요?
        </h2>
        <div className="grid md:grid-cols-2 gap-6">
          {FEATURES.map(f => (
            <div key={f.title} className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
              <div className="text-3xl mb-3">{f.icon}</div>
              <h3 className="font-bold text-gray-900 mb-2">{f.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 시험 과목 */}
      <section className="bg-white border-y border-gray-100">
        <div className="max-w-6xl mx-auto px-4 py-16">
          <h2 className="text-2xl font-bold text-center text-gray-900 mb-10">전 과목 완벽 커버</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
                <span className="bg-red-100 text-red-600 text-xs px-2 py-0.5 rounded">기계분야</span>
                필기 5과목
              </h3>
              <ul className="space-y-2">
                {SUBJECTS_MECHANICAL.map((s, i) => (
                  <li key={s} className="flex items-center gap-3 text-gray-600">
                    <span className="w-6 h-6 bg-red-50 text-red-600 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                      {i + 1}
                    </span>
                    {s}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
                <span className="bg-blue-100 text-blue-600 text-xs px-2 py-0.5 rounded">전기분야</span>
                필기 5과목
              </h3>
              <ul className="space-y-2">
                {SUBJECTS_ELECTRICAL.map((s, i) => (
                  <li key={s} className="flex items-center gap-3 text-gray-600">
                    <span className="w-6 h-6 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                      {i + 1}
                    </span>
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 요금 안내 */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <h2 className="text-2xl font-bold text-center text-gray-900 mb-2">합리적인 요금</h2>
        <p className="text-center text-gray-500 mb-10">시험 합격 후 취소하면 그만</p>
        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {/* 무료 */}
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="text-lg font-bold text-gray-900 mb-1">무료</div>
            <div className="text-3xl font-bold text-gray-900 mb-4">₩0</div>
            <ul className="space-y-2 text-sm text-gray-600 mb-6">
              <li>✓ 기출문제 50% 무료 공개</li>
              <li>✓ 과목별 문제 풀기</li>
              <li className="text-gray-400">✗ CBT 모의고사</li>
              <li className="text-gray-400">✗ 오답노트</li>
            </ul>
            <Link href="/signup" className="block text-center bg-gray-100 text-gray-700 py-2 rounded-lg font-medium hover:bg-gray-200">
              무료 시작
            </Link>
          </div>

          {/* 베이직 */}
          <div className="bg-red-600 rounded-xl p-6 text-white relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-yellow-400 text-yellow-900 text-xs font-bold px-3 py-1 rounded-full">
              인기
            </div>
            <div className="text-lg font-bold mb-1">베이직</div>
            <div className="text-3xl font-bold mb-1">₩4,900</div>
            <div className="text-red-200 text-sm mb-4">/ 월</div>
            <ul className="space-y-2 text-sm text-red-100 mb-6">
              <li>✓ 전체 문제 무제한</li>
              <li>✓ CBT 모의고사 무제한</li>
              <li>✓ 오답노트 자동 저장</li>
              <li className="text-red-300">✗ AI 취약점 분석</li>
            </ul>
            <Link href="/pricing" className="block text-center bg-white text-red-600 py-2 rounded-lg font-bold hover:bg-red-50">
              구독하기
            </Link>
          </div>

          {/* 프리미엄 */}
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="text-lg font-bold text-gray-900 mb-1">프리미엄</div>
            <div className="text-3xl font-bold text-gray-900 mb-1">₩9,900</div>
            <div className="text-gray-400 text-sm mb-4">/ 월</div>
            <ul className="space-y-2 text-sm text-gray-600 mb-6">
              <li>✓ 베이직 전체 포함</li>
              <li>✓ AI 취약점 분석 리포트</li>
              <li>✓ 법령 개정 알림</li>
              <li>✓ 합격 예측 점수</li>
            </ul>
            <Link href="/pricing" className="block text-center bg-gray-900 text-white py-2 rounded-lg font-medium hover:bg-gray-800">
              구독하기
            </Link>
          </div>
        </div>
      </section>

      {/* 하단 CTA */}
      <section className="bg-gray-900 text-white">
        <div className="max-w-6xl mx-auto px-4 py-16 text-center">
          <h2 className="text-2xl font-bold mb-3">지금 바로 시작하세요</h2>
          <p className="text-gray-400 mb-8">무료로 시작하고, 필요할 때 업그레이드</p>
          <Link
            href="/practice"
            className="bg-red-600 text-white font-bold px-10 py-3 rounded-full hover:bg-red-700 transition-colors text-lg"
          >
            무료로 문제 풀기
          </Link>
        </div>
      </section>

      {/* 푸터 */}
      <footer className="bg-gray-800 text-gray-400 text-sm">
        <div className="max-w-6xl mx-auto px-4 py-6 flex flex-col md:flex-row justify-between items-center gap-2">
          <div>소방 문제은행 · 소방설비기사/산업기사 필기 대비</div>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:text-white">개인정보처리방침</Link>
            <Link href="/terms" className="hover:text-white">이용약관</Link>
          </div>
        </div>
      </footer>
    </>
  )
}
