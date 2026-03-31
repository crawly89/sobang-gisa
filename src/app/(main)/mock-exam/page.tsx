import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = { title: 'CBT 모의고사' }

const EXAM_OPTIONS = [
  {
    field: 'mechanical',
    label: '기계분야',
    desc: '소방원론 · 유체역학 · 법규 · 소화설비 · 경보/피난',
    color: 'red',
  },
  {
    field: 'electrical',
    label: '전기분야',
    desc: '소방원론 · 전기일반 · 법규 · 전기시설 · 위험물',
    color: 'blue',
  },
]

export default function MockExamPage() {
  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">CBT 모의고사</h1>
      <p className="text-gray-500 mb-2">
        실제 큐넷 CBT와 동일한 환경으로 연습하세요.
      </p>

      {/* 시험 안내 박스 */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-8 text-sm text-amber-800">
        <p className="font-medium mb-1">시험 정보</p>
        <ul className="space-y-1 text-amber-700">
          <li>• 총 문제수: 5과목 × 20문제 = <strong>100문제</strong></li>
          <li>• 제한시간: <strong>120분</strong></li>
          <li>• 합격 기준: 과목당 40점 이상, 전 과목 평균 <strong>60점 이상</strong></li>
          <li>• 과목 간 자유 이동 가능</li>
        </ul>
      </div>

      {/* 분야 선택 */}
      <div className="space-y-4 mb-8">
        <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide">응시 분야 선택</h2>
        {EXAM_OPTIONS.map(opt => (
          <Link
            key={opt.field}
            href={`/mock-exam/${opt.field}`}
            className={`flex items-center justify-between bg-white rounded-xl p-5 border-2 transition-all group ${
              opt.color === 'red'
                ? 'border-gray-100 hover:border-red-400'
                : 'border-gray-100 hover:border-blue-400'
            }`}
          >
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                  opt.color === 'red'
                    ? 'bg-red-100 text-red-600'
                    : 'bg-blue-100 text-blue-600'
                }`}>
                  {opt.label}
                </span>
                <span className="font-bold text-gray-900">소방설비기사</span>
              </div>
              <div className="text-sm text-gray-400">{opt.desc}</div>
            </div>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
              opt.color === 'red'
                ? 'bg-red-50 group-hover:bg-red-600'
                : 'bg-blue-50 group-hover:bg-blue-600'
            }`}>
              <svg className={`w-5 h-5 transition-colors ${
                opt.color === 'red'
                  ? 'text-red-400 group-hover:text-white'
                  : 'text-blue-400 group-hover:text-white'
              }`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>
        ))}
      </div>

      {/* 최근 모의고사 */}
      <div>
        <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">최근 응시 내역</h2>
        <div className="bg-white rounded-xl border border-gray-100 p-6 text-center text-gray-400 text-sm">
          로그인하면 응시 내역과 점수를 확인할 수 있어요.
          <br />
          <Link href="/login" className="text-red-600 font-medium mt-2 inline-block hover:underline">
            로그인하기
          </Link>
        </div>
      </div>
    </div>
  )
}
