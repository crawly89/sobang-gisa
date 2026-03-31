// ============================================================
// 자격증 관련 타입
// ============================================================

export type ExamType = 'engineer' | 'industrial' // 기사 | 산업기사
export type ExamField = 'mechanical' | 'electrical' // 기계 | 전기

export type Subject =
  | 'fire_principles'       // 소방원론
  | 'fluid_mechanics'       // 소방유체역학 (기계)
  | 'fire_law'              // 소방관계법규
  | 'suppression_systems'   // 소화설비 (기계)
  | 'alarm_evacuation'      // 경보 및 피난설비 (기계)
  | 'electrical_general'    // 소방전기일반 (전기)
  | 'electrical_systems'    // 소방전기시설의 구조 및 원리 (전기)
  | 'hazmat'                // 위험물의 성상 및 시설기준 (전기)

export type QuestionSource = 'qnet_official' | 'ai_generated' | 'community_restored'

export type SubscriptionPlan = 'free' | 'basic' | 'premium'

// ============================================================
// DB 테이블 타입
// ============================================================

export interface Question {
  id: string
  exam_type: ExamType
  exam_field: ExamField
  subject: Subject
  year: number | null           // 기출 연도 (AI 생성이면 null)
  round: number | null          // 시험 회차 (1회, 2회, 4회)
  question_number: number | null
  question_text: string
  option_a: string
  option_b: string
  option_c: string
  option_d: string
  answer: 1 | 2 | 3 | 4
  explanation: string | null
  law_reference: string | null  // 관련 법조문 (법명 + 조항)
  source: QuestionSource
  difficulty: 1 | 2 | 3 | 4 | 5
  verified: boolean
  created_at: string
}

export interface UserAnswer {
  id: string
  user_id: string
  question_id: string
  selected_answer: 1 | 2 | 3 | 4
  is_correct: boolean
  time_spent: number            // 초 단위
  answered_at: string
}

export interface MockExam {
  id: string
  user_id: string
  exam_type: ExamType
  exam_field: ExamField
  question_ids: string[]
  answers: Record<string, 1 | 2 | 3 | 4>
  score: number | null
  started_at: string
  completed_at: string | null
}

export interface LawSource {
  id: string
  law_id: string                // 법제처 법령 ID
  law_name: string
  article_no: string            // 제X조
  clause_no: string | null      // 제X항
  content: string
  last_updated: string
  generated_question_count: number
}

export interface CommunityReport {
  id: string
  user_id: string
  exam_type: ExamType
  exam_field: ExamField
  subject: Subject
  exam_year: number
  exam_round: number
  question_text: string
  option_a: string
  option_b: string
  option_c: string
  option_d: string
  answer: 1 | 2 | 3 | 4
  explanation: string | null
  status: 'pending' | 'approved' | 'rejected'
  reward_points: number
  created_at: string
}

// ============================================================
// 스크래핑 결과 타입 (큐넷 파싱용)
// ============================================================

export interface RawQnetQuestion {
  examType: ExamType
  examField: ExamField
  subject: Subject
  year: number
  round: number
  questionNumber: number
  questionText: string
  options: [string, string, string, string]
  answer: 1 | 2 | 3 | 4
}

// ============================================================
// 학습 통계 타입
// ============================================================

export interface SubjectStats {
  subject: Subject
  totalAnswered: number
  correctCount: number
  correctRate: number           // 0~100
}

export interface StudyReport {
  userId: string
  totalAnswered: number
  totalCorrect: number
  overallRate: number
  subjectStats: SubjectStats[]
  weakSubjects: Subject[]       // 정답률 60% 미만
  strongSubjects: Subject[]     // 정답률 80% 이상
}
