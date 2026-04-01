import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'

export const metadata = {
  title: '관리자 로그인',
}

async function handleLogin(formData: FormData) {
  'use server'

  const password = formData.get('password') as string
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin1234'

  if (password === ADMIN_PASSWORD) {
    const cookieStore = await cookies()
    cookieStore.set('admin_auth', ADMIN_PASSWORD, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7일
    })
    redirect('/admin')
  }

  redirect('/admin-login?error=1')
}

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; pw?: string }>
}) {
  const params = await searchParams

  // 쿼리 파라미터로 바로 로그인 (개발용 편의 기능)
  if (params.pw) {
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin1234'
    if (params.pw === ADMIN_PASSWORD) {
      const cookieStore = await cookies()
      cookieStore.set('admin_auth', ADMIN_PASSWORD, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7일
      })
      redirect('/admin')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">관리자 로그인</h1>
            <p className="text-gray-500">소방설비기사 문제풀이 플랫폼</p>
          </div>

          <form action={handleLogin} className="space-y-6">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                관리자 비밀번호
              </label>
              <input
                type="password"
                id="password"
                name="password"
                required
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all"
                placeholder="비밀번호 입력"
              />
            </div>

            {/* Error Message */}
            {params.error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                비밀번호가 일치하지 않습니다.
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-red-600 text-white py-3 rounded-xl font-medium hover:bg-red-700 transition-colors"
            >
              로그인
            </button>
          </form>

          {/* 빠른 로그in 링크 (개발용) */}
          <div className="mt-6 p-4 bg-blue-50 rounded-xl">
            <div className="text-sm font-medium text-blue-800 mb-2">💡 빠른 로그인</div>
            <a
              href="/admin-login?pw=admin1234"
              className="text-sm text-blue-600 hover:text-blue-800 underline"
            >
              비밀번호 없이 바로 로그인
            </a>
          </div>

          <div className="mt-6 text-center">
            <a href="/" className="text-sm text-gray-500 hover:text-gray-700">
              ← 홈으로
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
