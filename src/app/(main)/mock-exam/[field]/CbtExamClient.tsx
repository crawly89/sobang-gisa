'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { ExamField, Subject } from '@/types'

const SUBJECT_LABELS: Record<Subject, string> = {
  fire_principles:     '소방원론',
  fluid_mechanics:     '소방유체역학',
  fire_law:            '소방관계법규',
  suppression_systems: '소화설비',
  alarm_evacuation:    '경보 및 피난설비',
  electrical_general:  '소방전기일반',
  electrical_systems:  '소방전기시설의 구조 및 원리',
  hazmat:              '위험물의 성상 및 시설기준',
}

interface Question {
  id: string
  subject: Subject
  question_text: string
  option_a: string
  option_b: string
  option_c: string
  option_d: string
}

interface Props {
  questions: Question[]
  examField: ExamField
}

const TOTAL_MINUTES = 120

export default function CbtExamClient({ questions, examField }: Props) {
  const router = useRouter()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, 1 | 2 | 3 | 4>>({})
  const [timeLeft, setTimeLeft] = useState(TOTAL_MINUTES * 60)
  const [submitted, setSubmitted] = useState(false)
  const [showAnswerSheet, setShowAnswerSheet] = useState(false)

  const current = questions[currentIndex]
  const answeredCount = Object.keys(answers).length
  const unansweredCount = questions.length - answeredCount

  // 타이머
  useEffect(() => {
    if (submitted) return
    const timer = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timer)
          handleSubmit()
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [submitted])

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0')
    const s = (secs % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  const isWarning = timeLeft < 600 // 10분 미만 경고

  const handleAnswer = (qId: string, ans: 1 | 2 | 3 | 4) => {
    setAnswers(prev => ({ ...prev, [qId]: ans }))
  }

  const handleSubmit = useCallback(() => {
    if (submitted) return
    if (unansweredCount > 0 && timeLeft > 0) {
      const ok = window.confirm(`미답 문제가 ${unansweredCount}개 있습니다. 제출하시겠습니까?`)
      if (!ok) return
    }
    setSubmitted(true)
  }, [submitted, unansweredCount, timeLeft])

  // 과목 그룹 (답안표용)
  const subjectGroups = questions.reduce((acc, q, idx) => {
    const subj = q.subject
    if (!acc[subj]) acc[subj] = []
    acc[subj].push(idx)
    return acc
  }, {} as Record<string, number[]>)

  const OPTIONS: Array<{ key: keyof Question & ('option_a'|'option_b'|'option_c'|'option_d'); num: 1|2|3|4; label: string }> = [
    { key: 'option_a', num: 1, label: '①' },
    { key: 'option_b', num: 2, label: '②' },
    { key: 'option_c', num: 3, label: '③' },
    { key: 'option_d', num: 4, label: '④' },
  ]

  if (submitted) {
    return <ExamResult questions={questions} answers={answers} examField={examField} />
  }

  return (
    <div className="flex gap-0 md:gap-4 -mx-4 md:mx-0">
      {/* 좌측: 답안표 (데스크톱) */}
      <div className="hidden md:flex flex-col w-44 flex-shrink-0">
        <div className="bg-white border border-gray-200 rounded-xl p-3 sticky top-20">
          <div className={`text-center font-mono font-bold text-lg mb-3 ${isWarning ? 'text-red-600 animate-pulse' : 'text-gray-900'}`}>
            {formatTime(timeLeft)}
          </div>
          <div className="text-xs text-gray-400 text-center mb-3">
            {answeredCount}/{questions.length} 답안 완료
          </div>
          <div className="grid grid-cols-5 gap-1">
            {questions.map((q, idx) => {
              const isAnswered = !!answers[q.id]
              const isCurrent = idx === currentIndex
              return (
                <button
                  key={q.id}
                  onClick={() => setCurrentIndex(idx)}
                  className={`cbt-answer-item text-xs py-1 ${
                    isCurrent ? 'current' : isAnswered ? 'answered' : 'unanswered'
                  }`}
                >
                  {idx + 1}
                </button>
              )
            })}
          </div>
          <button
            onClick={handleSubmit}
            className="mt-4 w-full bg-red-600 text-white text-sm font-bold py-2 rounded-lg hover:bg-red-700"
          >
            제출
          </button>
        </div>
      </div>

      {/* 문제 영역 */}
      <div className="flex-1 min-w-0">
        {/* 모바일 헤더 */}
        <div className="md:hidden bg-white border-b border-gray-100 px-4 py-3 -mx-4 mb-4 flex items-center justify-between sticky top-14 z-10">
          <span className="text-sm text-gray-500">{currentIndex + 1}/{questions.length}</span>
          <span className={`font-mono font-bold ${isWarning ? 'text-red-600' : 'text-gray-900'}`}>
            {formatTime(timeLeft)}
          </span>
          <button
            onClick={() => setShowAnswerSheet(!showAnswerSheet)}
            className="text-sm text-red-600 font-medium"
          >
            답안표
          </button>
        </div>

        {/* 모바일 답안표 오버레이 */}
        {showAnswerSheet && (
          <div className="md:hidden bg-white border border-gray-200 rounded-xl p-4 mb-4 mx-0">
            <div className="grid grid-cols-10 gap-1">
              {questions.map((q, idx) => (
                <button
                  key={q.id}
                  onClick={() => { setCurrentIndex(idx); setShowAnswerSheet(false) }}
                  className={`cbt-answer-item ${
                    idx === currentIndex ? 'current' : answers[q.id] ? 'answered' : 'unanswered'
                  }`}
                >
                  {idx + 1}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 문제 카드 */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          {/* 과목/번호 */}
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xs bg-red-50 text-red-600 font-medium px-2 py-0.5 rounded">
              {SUBJECT_LABELS[current.subject]}
            </span>
            <span className="text-sm text-gray-400">{currentIndex + 1}번</span>
          </div>

          {/* 문제 텍스트 */}
          <p className="text-gray-900 font-medium leading-relaxed mb-6">
            {currentIndex + 1}. {current.question_text}
          </p>

          {/* 선택지 */}
          <div className="space-y-3">
            {OPTIONS.map(opt => {
              const isSelected = answers[current.id] === opt.num
              return (
                <button
                  key={opt.num}
                  onClick={() => handleAnswer(current.id, opt.num)}
                  className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                    isSelected
                      ? 'border-red-500 bg-red-50 text-red-700'
                      : 'border-gray-100 hover:border-red-200 hover:bg-red-50/30 text-gray-700'
                  }`}
                >
                  <span className="font-medium mr-2">{opt.label}</span>
                  {current[opt.key]}
                </button>
              )
            })}
          </div>

          {/* 이전/다음 */}
          <div className="flex justify-between mt-6 pt-4 border-t border-gray-100">
            <button
              onClick={() => setCurrentIndex(i => Math.max(0, i - 1))}
              disabled={currentIndex === 0}
              className="px-5 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg disabled:opacity-30 hover:bg-gray-50"
            >
              이전
            </button>
            {currentIndex < questions.length - 1 ? (
              <button
                onClick={() => setCurrentIndex(i => i + 1)}
                className="px-5 py-2 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                다음
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                className="px-5 py-2 text-sm font-bold bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                제출하기
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// 결과 화면
// ============================================================

function ExamResult({
  questions,
  answers,
}: {
  questions: Question[]
  answers: Record<string, 1 | 2 | 3 | 4>
  examField: ExamField
}) {
  const answeredCount = Object.keys(answers).length
  const score = Math.round((answeredCount / questions.length) * 100)

  const subjectStats = questions.reduce((acc, q) => {
    if (!acc[q.subject]) acc[q.subject] = { total: 0, answered: 0 }
    acc[q.subject].total++
    if (answers[q.id]) acc[q.subject].answered++
    return acc
  }, {} as Record<string, { total: number; answered: number }>)

  const isPassed = score >= 60

  return (
    <div className="max-w-xl mx-auto">
      <div className={`rounded-2xl p-8 text-center mb-6 ${isPassed ? 'bg-green-50' : 'bg-red-50'}`}>
        <div className={`text-5xl font-bold mb-2 ${isPassed ? 'text-green-600' : 'text-red-600'}`}>
          {score}점
        </div>
        <div className={`text-lg font-medium ${isPassed ? 'text-green-700' : 'text-red-700'}`}>
          {isPassed ? '합격 예상' : '불합격 예상'}
        </div>
        <p className="text-gray-500 text-sm mt-2">
          {answeredCount}/{questions.length}문제 응답
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-5 mb-4">
        <h3 className="font-bold text-gray-900 mb-4">과목별 결과</h3>
        <div className="space-y-3">
          {Object.entries(subjectStats).map(([subj, stat]) => {
            const rate = Math.round((stat.answered / stat.total) * 100)
            return (
              <div key={subj}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">{SUBJECT_LABELS[subj as Subject]}</span>
                  <span className={`font-medium ${rate >= 40 ? 'text-green-600' : 'text-red-600'}`}>
                    {rate}점
                  </span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full">
                  <div
                    className={`h-full rounded-full ${rate >= 40 ? 'bg-green-400' : 'bg-red-400'}`}
                    style={{ width: `${rate}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="flex gap-3">
        <a href="/mock-exam" className="flex-1 text-center py-3 border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-50">
          다시 응시
        </a>
        <a href="/wrong-notes" className="flex-1 text-center py-3 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700">
          오답 복습
        </a>
      </div>
    </div>
  )
}
