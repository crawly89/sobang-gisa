'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function SignupPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 8) {
      setError('비밀번호는 8자 이상이어야 합니다.')
      return
    }
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    })

    if (error) {
      setError(error.message === 'User already registered'
        ? '이미 가입된 이메일입니다.'
        : error.message || '회원가입 중 오류가 발생했습니다.')
      setLoading(false)
      return
    }

    // 이메일 확인 없이 바로 세션 생성
    if (data.user && !data.session) {
      // 세션이 없지만 사용자는 생성된 경우 - 로그인 시도
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        // 로그인 실패해도 가입은 성공으로 처리
        setDone(true)
        return
      }

      // 로그인 성공하면 대시보드로
      router.push('/dashboard')
      router.refresh()
      return
    }

    setDone(true)
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center max-w-sm w-full">
          <div className="text-4xl mb-4">📧</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">이메일 확인해주세요</h2>
          <p className="text-gray-500 text-sm mb-6">
            <strong>{email}</strong>로 인증 링크를 발송했습니다.<br />
            링크를 클릭하면 바로 로그인됩니다.
          </p>
          <Link href="/login" className="text-red-600 font-medium hover:underline text-sm">
            로그인 페이지로
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="text-2xl font-bold text-gray-900">
            🔥 소방설비기사
          </Link>
          <p className="text-gray-500 text-sm mt-1">무료로 시작하기</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
          <h1 className="text-xl font-bold text-gray-900 mb-6">회원가입</h1>

          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">이메일</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="example@email.com"
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-red-400 focus:ring-1 focus:ring-red-200"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">비밀번호</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="8자 이상"
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-red-400 focus:ring-1 focus:ring-red-200"
              />
            </div>

            {error && (
              <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-red-600 text-white font-bold py-3 rounded-xl hover:bg-red-700 disabled:opacity-60 transition-colors"
            >
              {loading ? '가입 중...' : '무료 회원가입'}
            </button>
          </form>

          <p className="mt-4 text-xs text-gray-400 text-center">
            가입 시{' '}
            <Link href="/terms" className="underline">이용약관</Link>
            {' '}및{' '}
            <Link href="/privacy" className="underline">개인정보처리방침</Link>
            에 동의합니다.
          </p>

          <div className="mt-6 text-center text-sm text-gray-500">
            이미 계정이 있으신가요?{' '}
            <Link href="/login" className="text-red-600 font-medium hover:underline">
              로그인
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
