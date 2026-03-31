# 소방설비기사 문제풀이 플랫폼

소방설비기사/소방설비산업기사 필기시험 대비 문제풀이 서비스

## 주요 기능

- ✅ 문제풀기 (과목별/연도별 기출)
- ✅ CBT 모의고사
- ✅ 학습 통계 및 취약점 분석
- ✅ 오답노트
- ✅ 관리자 대시보드 (AI 생성 문제 검수)

## 기술 스택

- **Frontend**: Next.js 16 (App Router), React 19, Tailwind CSS 4
- **Backend**: Supabase (PostgreSQL + Auth + RLS)
- **AI**: Claude API (문제 자동 생성)

## 시작하기

### 1. 환경 설정

```bash
cp .env.example .env.local
```

`.env.local`에 다음 환경변수를 설정하세요:

```env
# Supabase (supabase.com 대시보드에서 발급)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_publishable_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Anthropic Claude API (console.anthropic.com)
ANTHROPIC_API_KEY=your_anthropic_api_key

# 법제처 오픈 API (선택사항)
LAW_API_KEY=your_law_api_key
```

### 2. DB 스키마 적용

Supabase 대시보드 > SQL Editor에서 다음을 실행:

```sql
-- supabase/migrations/001_initial_schema.sql 내용 실행
```

### 3. 개발 서버 실행

```bash
npm install
npm run dev
```

http://localhost:3000 접속

## 문제 생성

### Claude API로 문제 생성

```bash
# 드라이런 (DB 저장 없이 미리보기)
npm run script:gen-questions -- --dry-run --count=10

# 실제 DB 저장
npm run script:gen-questions -- --count=50
```

### 관리자 승인

생성된 문제는 `verified: false` 상태로 저장되며, 관리자 승인 후 서비스에 노출됩니다.

```bash
# 일괄 승인
npx tsx scripts/verify-all-questions.ts
```

또는 http://localhost:3000/admin 접속

## 배포

### Vercel 배포

1. GitHub에 코드 푸시
2. [Vercel](https://vercel.com/new)에서 프로젝트 가져오기
3. 환경변수 설정:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `ANTHROPIC_API_KEY` (선택사항)

### 로컬 빌드 테스트

```bash
npm run build
npm start
```

## 프로젝트 구조

```
sobang-gisa/
├── src/
│   ├── app/              # Next.js App Router
│   │   ├── (auth)/       # 인증 페이지 (로그인/회원가입)
│   │   ├── (main)/       # 메인 페이지 (문제풀기/대시보드/모의고사)
│   │   ├── admin/        # 관리자 대시보드
│   │   └── api/          # API 라우트
│   ├── components/       # 리액트 컴포넌트
│   ├── lib/              # 유틸리티 (Supabase 클라이언트)
│   └── types/            # TypeScript 타입 정의
├── scripts/              # 스크립트 (문제 생성/스크래핑)
├── supabase/             # DB 마이그레이션
└── public/               # 정적 파일
```

## 라이선스

MIT
