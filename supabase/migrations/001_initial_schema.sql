-- ============================================================
-- 소방설비기사 문제풀이 플랫폼 초기 스키마
-- ============================================================

-- 확장 기능
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- ENUM 타입 정의
-- ============================================================

CREATE TYPE exam_type AS ENUM ('engineer', 'industrial');
CREATE TYPE exam_field AS ENUM ('mechanical', 'electrical');
CREATE TYPE subject_type AS ENUM (
  'fire_principles',
  'fluid_mechanics',
  'fire_law',
  'suppression_systems',
  'alarm_evacuation',
  'electrical_general',
  'electrical_systems',
  'hazmat'
);
CREATE TYPE question_source AS ENUM ('qnet_official', 'ai_generated', 'community_restored');
CREATE TYPE subscription_plan AS ENUM ('free', 'basic', 'premium');
CREATE TYPE report_status AS ENUM ('pending', 'approved', 'rejected');

-- ============================================================
-- 문제 테이블
-- ============================================================

CREATE TABLE questions (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  exam_type         exam_type NOT NULL,
  exam_field        exam_field NOT NULL,
  subject           subject_type NOT NULL,
  year              INTEGER,           -- 기출 연도 (AI 생성이면 NULL)
  round             INTEGER,           -- 회차 (1, 2, 4)
  question_number   INTEGER,           -- 문제 번호
  question_text     TEXT NOT NULL,
  option_a          TEXT NOT NULL,
  option_b          TEXT NOT NULL,
  option_c          TEXT NOT NULL,
  option_d          TEXT NOT NULL,
  answer            SMALLINT NOT NULL CHECK (answer BETWEEN 1 AND 4),
  explanation       TEXT,
  law_reference     TEXT,              -- 예: "소방시설법 제9조 제1항"
  source            question_source NOT NULL DEFAULT 'qnet_official',
  difficulty        SMALLINT DEFAULT 3 CHECK (difficulty BETWEEN 1 AND 5),
  verified          BOOLEAN NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 자주 사용하는 쿼리 패턴에 최적화된 인덱스
CREATE INDEX idx_questions_filter
  ON questions (exam_type, exam_field, subject, verified);

CREATE INDEX idx_questions_year_round
  ON questions (year DESC, round DESC)
  WHERE year IS NOT NULL;

CREATE INDEX idx_questions_source
  ON questions (source, verified);

-- ============================================================
-- 사용자 프로필 (Supabase Auth 연동)
-- ============================================================

CREATE TABLE profiles (
  id                  UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email               TEXT NOT NULL,
  nickname            TEXT,
  subscription_plan   subscription_plan NOT NULL DEFAULT 'free',
  subscription_expires_at TIMESTAMPTZ,
  points              INTEGER NOT NULL DEFAULT 0,  -- 복원 문제 제보 포인트
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 풀이 기록 (취약점 분석 원천 데이터)
-- ============================================================

CREATE TABLE user_answers (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  question_id     UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  selected_answer SMALLINT NOT NULL CHECK (selected_answer BETWEEN 1 AND 4),
  is_correct      BOOLEAN NOT NULL,
  time_spent      INTEGER,           -- 초 단위
  answered_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_answers_user
  ON user_answers (user_id, answered_at DESC);

CREATE INDEX idx_user_answers_question
  ON user_answers (question_id);

-- ============================================================
-- 모의고사
-- ============================================================

CREATE TABLE mock_exams (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  exam_type       exam_type NOT NULL,
  exam_field      exam_field NOT NULL,
  question_ids    UUID[] NOT NULL,
  answers         JSONB NOT NULL DEFAULT '{}',   -- { "question_id": 1~4 }
  score           SMALLINT,                       -- 0~100
  started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at    TIMESTAMPTZ
);

CREATE INDEX idx_mock_exams_user
  ON mock_exams (user_id, started_at DESC);

-- ============================================================
-- 법령 소스 (AI 문제 자동 생성용)
-- ============================================================

CREATE TABLE law_sources (
  id                        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  law_id                    TEXT NOT NULL,        -- 법제처 법령 MST ID
  law_name                  TEXT NOT NULL,
  article_no                TEXT NOT NULL,        -- 예: "제9조"
  clause_no                 TEXT,                 -- 예: "제1항"
  content                   TEXT NOT NULL,
  last_updated              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  generated_question_count  INTEGER NOT NULL DEFAULT 0,
  UNIQUE (law_id, article_no, clause_no)
);

-- ============================================================
-- 복원 문제 제보
-- ============================================================

CREATE TABLE community_reports (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  exam_type       exam_type NOT NULL,
  exam_field      exam_field NOT NULL,
  subject         subject_type NOT NULL,
  exam_year       INTEGER NOT NULL,
  exam_round      INTEGER NOT NULL,
  question_text   TEXT NOT NULL,
  option_a        TEXT NOT NULL,
  option_b        TEXT NOT NULL,
  option_c        TEXT NOT NULL,
  option_d        TEXT NOT NULL,
  answer          SMALLINT NOT NULL CHECK (answer BETWEEN 1 AND 4),
  explanation     TEXT,
  status          report_status NOT NULL DEFAULT 'pending',
  reward_points   INTEGER NOT NULL DEFAULT 50,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Row Level Security (접근 제어)
-- ============================================================

ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE mock_exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE law_sources ENABLE ROW LEVEL SECURITY;

-- 문제: 검증된 문제는 누구나 읽기 가능
CREATE POLICY "questions_select_verified"
  ON questions FOR SELECT
  USING (verified = TRUE);

-- 프로필: 본인 것만 읽기/수정
CREATE POLICY "profiles_select_own"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- 풀이 기록: 본인 것만
CREATE POLICY "user_answers_own"
  ON user_answers FOR ALL
  USING (auth.uid() = user_id);

-- 모의고사: 본인 것만
CREATE POLICY "mock_exams_own"
  ON mock_exams FOR ALL
  USING (auth.uid() = user_id);

-- 복원 제보: 로그인 사용자만 작성, 본인 것만 조회
CREATE POLICY "community_reports_insert"
  ON community_reports FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "community_reports_select_own"
  ON community_reports FOR SELECT
  USING (auth.uid() = user_id);

-- 법령 소스: 읽기 전용 (서비스 롤만 수정)
CREATE POLICY "law_sources_select"
  ON law_sources FOR SELECT
  TO authenticated
  USING (TRUE);

-- ============================================================
-- 신규 가입 시 프로필 자동 생성 트리거
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- updated_at 자동 갱신 트리거
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER questions_updated_at
  BEFORE UPDATE ON questions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
