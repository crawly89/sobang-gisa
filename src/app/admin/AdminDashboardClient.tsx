'use client'

import { useState } from 'react'
import type { Question } from '@/types'

interface Props {
  questions: Question[]
}

const SUBJECT_LABELS: Record<string, string> = {
  fire_principles:    '소방원론',
  fluid_mechanics:    '소방유체역학',
  fire_law:           '소방관계법규',
  suppression_systems:'소화설비',
  alarm_evacuation:   '경보 및 피난설비',
  electrical_general: '소방전기일반',
  electrical_systems: '소방전기시설의 구조 및 원리',
  hazmat:             '위험물의 성상 및 시설기준',
}

export default function AdminDashboardClient({ questions: initialQuestions }: Props) {
  const [questions, setQuestions] = useState(initialQuestions)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [filterSubject, setFilterSubject] = useState<string>('all')
  const [isLoading, setIsLoading] = useState(false)

  const filteredQuestions = filterSubject === 'all'
    ? questions
    : questions.filter(q => q.subject === filterSubject)

  const currentQuestion = filteredQuestions[selectedIndex]

  const handleApprove = async (questionId: string) => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/admin/verify-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId, verified: true }),
      })

      if (res.ok) {
        setQuestions(prev => prev.filter(q => q.id !== questionId))
        if (selectedIndex >= filteredQuestions.length - 1) {
          setSelectedIndex(Math.max(0, selectedIndex - 1))
        }
      }
    } catch (error) {
      console.error('Error approving question:', error)
      alert('승인 실패')
    } finally {
      setIsLoading(false)
    }
  }

  const handleReject = async (questionId: string) => {
    if (!confirm('정말 이 문제를 삭제하시겠습니까?')) return

    setIsLoading(true)
    try {
      const res = await fetch('/api/admin/delete-question', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId }),
      })

      if (res.ok) {
        setQuestions(prev => prev.filter(q => q.id !== questionId))
        if (selectedIndex >= filteredQuestions.length - 1) {
          setSelectedIndex(Math.max(0, selectedIndex - 1))
        }
      }
    } catch (error) {
      console.error('Error rejecting question:', error)
      alert('삭제 실패')
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerifyAll = async () => {
    if (!confirm(`정말 검수 대기 중인 모든 문제(${questions.length}개)를 일괄 승인하시겠습니까?`)) return

    setIsLoading(true)
    try {
      const res = await fetch('/api/admin/verify-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      if (res.ok) {
        const data = await res.json()
        alert(data.message)
        setQuestions([])
        setSelectedIndex(0)
      } else {
        alert('일괄 승인 실패')
      }
    } catch (error) {
      console.error('Error verifying all:', error)
      alert('일괄 승인 실패')
    } finally {
      setIsLoading(false)
    }
  }

  if (!currentQuestion) {
    return (
      <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
        <div className="text-4xl mb-4">✅</div>
        <p className="text-gray-500">모든 문제 검수 완료!</p>
      </div>
    )
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
      {/* 필터 & 일괄 승인 */}
      <div className="bg-white rounded-xl p-4 border border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">과목 필터:</span>
            <select
              value={filterSubject}
              onChange={(e) => {
                setFilterSubject(e.target.value)
                setSelectedIndex(0)
              }}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
            >
              <option value="all">전체 ({questions.length})</option>
              {Array.from(new Set(questions.map(q => q.subject))).map(subject => (
                <option key={subject} value={subject}>
                  {SUBJECT_LABELS[subject]} ({questions.filter(q => q.subject === subject).length})
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={handleVerifyAll}
            disabled={isLoading || questions.length === 0}
            className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            ✅ 일괄 승인 ({questions.length}개)
          </button>
        </div>
      </div>

      {/* 검수 인터페이스 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 문제 목록 */}
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <div className="text-sm font-medium text-gray-700 mb-3">
            검수 대기 목록 ({filteredQuestions.length})
          </div>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filteredQuestions.map((q, idx) => (
              <button
                key={q.id}
                onClick={() => setSelectedIndex(idx)}
                className={`w-full text-left p-3 rounded-lg transition-colors ${
                  idx === selectedIndex
                    ? 'bg-red-50 border-2 border-red-300'
                    : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-600">
                    {SUBJECT_LABELS[q.subject]}
                  </span>
                  <span className="text-xs text-gray-400">
                    난이도 {q.difficulty}
                  </span>
                </div>
                <div className="text-sm text-gray-800 mt-1 line-clamp-2">
                  {q.question_text.slice(0, 50)}...
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 문제 상세 & 검수 */}
        <div className="lg:col-span-2 bg-white rounded-xl p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 bg-orange-100 text-orange-600 text-xs rounded font-medium">
                검수 대기 #{selectedIndex + 1}
              </span>
              <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                {SUBJECT_LABELS[currentQuestion.subject]}
              </span>
              <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                난이도 {'⭐'.repeat(currentQuestion.difficulty)}
              </span>
            </div>
          </div>

          {/* 문제 내용 */}
          <div className="text-lg font-medium text-gray-900 mb-4 leading-relaxed">
            {currentQuestion.question_text}
          </div>

          {/* 보기 */}
          <div className="space-y-2 mb-4">
            {options.map((option, idx) => {
              const optionNum = (idx + 1) as 1 | 2 | 3 | 4
              const isCorrect = optionNum === currentQuestion.answer
              return (
                <div
                  key={idx}
                  className={`p-3 rounded-lg border-2 ${
                    isCorrect ? 'border-green-500 bg-green-50' : 'border-gray-200'
                  }`}
                >
                  <span className="font-medium mr-2">{optionLabels[idx]}</span>
                  {option}
                  {isCorrect && (
                    <span className="ml-2 text-green-600 text-sm font-medium">
                      (정답)
                    </span>
                  )}
                </div>
              )
            })}
          </div>

          {/* 해설 */}
          {currentQuestion.explanation && (
            <div className="bg-blue-50 rounded-lg p-4 mb-4">
              <div className="text-sm font-medium text-blue-800 mb-2">💡 해설</div>
              <div className="text-sm text-blue-700 whitespace-pre-line">
                {currentQuestion.explanation}
              </div>
            </div>
          )}

          {/* 법령 참조 */}
          {currentQuestion.law_reference && (
            <div className="bg-gray-50 rounded-lg p-3 mb-4">
              <span className="text-sm text-gray-600">
                📖 {currentQuestion.law_reference}
              </span>
            </div>
          )}

          {/* 액션 버튼 */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              onClick={() => handleApprove(currentQuestion.id)}
              disabled={isLoading}
              className="flex-1 px-6 py-3 rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-green-600 text-white hover:bg-green-700"
            >
              ✅ 승인
            </button>
            <button
              onClick={() => handleReject(currentQuestion.id)}
              disabled={isLoading}
              className="flex-1 px-6 py-3 rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-red-600 text-white hover:bg-red-700"
            >
              🗑️ 삭제
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
