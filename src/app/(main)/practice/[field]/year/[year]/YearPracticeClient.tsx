'use client'

import { useState, useRef, useEffect } from 'react'
import type { Question, ExamField } from '@/types'

interface Props {
  questions: Question[]
  groupedByRound: Record<number | string, Question[]>
  year: number
  field: ExamField
}

export default function YearPracticeClient({
  questions,
  groupedByRound,
  year,
  field
}: Props) {
  const [selectedRound, setSelectedRound] = useState<number | string | 'all'>('all')
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<1 | 2 | 3 | 4 | null>(null)
  const [showExplanation, setShowExplanation] = useState(false)
  const [answers, setAnswers] = useState<Record<string, 1 | 2 | 3 | 4>>({})
  const [saving, setSaving] = useState(false)

  const questionStartTime = useRef<number>(Date.now())

  // 필터링된 문제 목록
  const filteredQuestions = selectedRound === 'all'
    ? questions
    : groupedByRound[selectedRound] || []

  const currentQuestion = filteredQuestions[currentIndex]
  const isCorrect = selectedAnswer === currentQuestion?.answer
  const progress = filteredQuestions.length > 0
    ? ((currentIndex + 1) / filteredQuestions.length) * 100
    : 0

  // 문제가 바뀔 때 시작 시간 재설정
  useEffect(() => {
    questionStartTime.current = Date.now()
  }, [currentIndex])

  const handleSelect = async (answer: 1 | 2 | 3 | 4) => {
    if (showExplanation || !currentQuestion) return

    const timeSpent = Math.round((Date.now() - questionStartTime.current) / 1000)

    setSelectedAnswer(answer)
    setShowExplanation(true)
    setAnswers(prev => ({ ...prev, [currentQuestion.id]: answer }))

    // 답안 저장 (API)
    setSaving(true)
    try {
      const res = await fetch('/api/user-answers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId: currentQuestion.id,
          selectedAnswer: answer,
          timeSpent,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        console.log('답안 저장 완료:', data)
      }
    } catch (error) {
      console.error('답안 저장 실패:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleNext = () => {
    if (currentIndex < filteredQuestions.length - 1) {
      setCurrentIndex(prev => prev + 1)
      setSelectedAnswer(null)
      setShowExplanation(false)
    }
  }

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1)
      const prevAnswer = answers[filteredQuestions[currentIndex - 1]?.id]
      setSelectedAnswer(prevAnswer || null)
      setShowExplanation(!!prevAnswer)
    }
  }

  const handleRoundChange = (round: number | string | 'all') => {
    setSelectedRound(round)
    setCurrentIndex(0)
    setSelectedAnswer(null)
    setShowExplanation(false)
  }

  if (!currentQuestion) {
    return (
      <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
        <div className="text-4xl mb-4">📋</div>
        <p className="text-gray-500">선택한 회차의 문제가 없습니다.</p>
      </div>
    )
  }

  const getOptionStyle = (optionNum: 1 | 2 | 3 | 4) => {
    const isSelected = selectedAnswer === optionNum
    const isCorrectAnswer = currentQuestion.answer === optionNum

    if (!showExplanation) {
      return isSelected
        ? 'border-red-500 bg-red-50'
        : 'border-gray-200 hover:border-red-300'
    }

    if (isCorrectAnswer) {
      return 'border-green-500 bg-green-50'
    }
    if (isSelected && !isCorrect) {
      return 'border-red-500 bg-red-50'
    }
    return 'border-gray-200'
  }

  const optionLabels = ['①', '②', '③', '④'] as const
  const options = [
    currentQuestion.option_a,
    currentQuestion.option_b,
    currentQuestion.option_c,
    currentQuestion.option_d,
  ] as const

  return (
    <div className="space-y-6">
      {/* 회차 선택 */}
      <div className="bg-white rounded-xl p-4 border border-gray-100">
        <div className="text-sm text-gray-500 mb-3">회차 선택</div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleRoundChange('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedRound === 'all'
                ? 'bg-red-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            전체 ({questions.length}문제)
          </button>
          {Object.keys(groupedByRound)
            .filter(key => key !== 'unknown')
            .sort()
            .map(round => (
              <button
                key={round}
                onClick={() => handleRoundChange(round)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedRound === round
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {round}회 ({groupedByRound[round].length}문제)
              </button>
            ))}
        </div>
      </div>

      {/* 진행률 바 */}
      <div className="bg-white rounded-xl p-4 border border-gray-100">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-500">
            문제 {currentIndex + 1} / {filteredQuestions.length}
          </span>
          <span className="text-sm font-medium text-red-600">
            {Math.round(progress)}%
          </span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2">
          <div
            className="bg-red-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* 문제 카드 */}
      <div className="bg-white rounded-xl p-6 border border-gray-100">
        {/* 문제 헤더 */}
        <div className="flex items-center gap-2 mb-4">
          {currentQuestion.round && (
            <span className="px-2 py-1 bg-red-100 text-red-600 text-xs rounded font-medium">
              {year}년 {currentQuestion.round}회
            </span>
          )}
          {currentQuestion.question_number && (
            <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
              {currentQuestion.question_number}번
            </span>
          )}
          <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
            난이도 {'⭐'.repeat(currentQuestion.difficulty)}
          </span>
          {currentQuestion.law_reference && (
            <span className="px-2 py-1 bg-blue-50 text-blue-600 text-xs rounded">
              {currentQuestion.law_reference}
            </span>
          )}
        </div>

        {/* 문제 내용 */}
        <div className="text-lg font-medium text-gray-900 mb-6 leading-relaxed">
          {currentQuestion.question_text}
        </div>

        {/* 보기 */}
        <div className="space-y-3">
          {options.map((option, idx) => {
            const optionNum = (idx + 1) as 1 | 2 | 3 | 4
            return (
              <button
                key={idx}
                onClick={() => handleSelect(optionNum)}
                disabled={showExplanation}
                className={`w-full text-left p-4 rounded-xl border-2 transition-all ${getOptionStyle(optionNum)} ${
                  showExplanation ? 'cursor-default' : 'cursor-pointer'
                }`}
              >
                <span className="font-medium mr-2">{optionLabels[idx]}</span>
                {option}
              </button>
            )
          })}
        </div>

        {/* 해설 */}
        {showExplanation && (
          <div className={`mt-6 p-4 rounded-xl border-2 ${
            isCorrect ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
          }`}>
            <div className="font-medium mb-2">
              {isCorrect ? '✅ 정답!' : '❌ 오답'}
              {saving && <span className="ml-2 text-sm text-gray-500">(저장 중...)</span>}
            </div>
            <div className="text-sm text-gray-700 whitespace-pre-line">
              {currentQuestion.explanation || '해설이 준비 중입니다.'}
            </div>
          </div>
        )}
      </div>

      {/* 네비게이션 */}
      <div className="flex justify-between">
        <button
          onClick={handlePrev}
          disabled={currentIndex === 0}
          className="px-6 py-3 rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
        >
          ← 이전
        </button>

        {currentIndex < filteredQuestions.length - 1 ? (
          <button
            onClick={handleNext}
            disabled={!showExplanation}
            className="px-6 py-3 rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-red-600 text-white hover:bg-red-700"
          >
            다음 →
          </button>
        ) : (
          <div className="px-6 py-3 rounded-xl font-medium bg-green-100 text-green-700">
            🎉 완료!
          </div>
        )}
      </div>

      {/* 문제 점프 */}
      <div className="bg-white rounded-xl p-4 border border-gray-100">
        <div className="text-sm text-gray-500 mb-3">문제 빠르게 이동</div>
        <div className="flex flex-wrap gap-2">
          {filteredQuestions.map((q, idx) => {
            const isAnswered = !!answers[q.id]
            const isCurrent = idx === currentIndex

            return (
              <button
                key={q.id}
                onClick={() => {
                  setCurrentIndex(idx)
                  const savedAnswer = answers[q.id]
                  setSelectedAnswer(savedAnswer || null)
                  setShowExplanation(!!savedAnswer)
                }}
                className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${
                  isCurrent
                    ? 'bg-red-600 text-white'
                    : isAnswered
                    ? 'bg-green-100 text-green-700 hover:bg-green-200'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {idx + 1}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
