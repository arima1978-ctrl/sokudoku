// ========== スクール ==========
export interface School {
  id: string
  school_id: string
  family_code: string
  school_name: string
  password: string
  email: string | null
  prefecture: string | null
  address: string | null
  tel: string | null
  tantou: string | null
  member_type: string
  status: string
  form_type: string | null
  course_name: string | null
  start_date: string | null
  end_date: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type SchoolInsert = Omit<School, 'id' | 'created_at' | 'updated_at'> & {
  id?: string
  created_at?: string
  updated_at?: string
}

export type SchoolUpdate = Partial<SchoolInsert>

export type MemberType = 'culture_kids' | 'eduplus' | 'none'
export type SchoolStatus = 'active' | 'trial' | 'cancelled'
export type FormType = 'contract' | 'trial'

// ========== 生徒 ==========
export interface Student {
  id: string
  school_id: string
  student_login_id: string
  student_password: string
  student_name: string | null
  grade: string | null
  grade_level_id: string | null
  preferred_subject_id: string | null
  parent_email: string | null
  parent_line_id: string | null
  onboarding_completed: boolean
  status: string
  start_date: string | null
  end_date: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type StudentStatus = 'active' | 'inactive'

// ========== 学年マスター ==========
export interface GradeLevel {
  id: string
  name: string
  display_order: number
  max_kanji_level: number
}

// ========== 分野マスター ==========
export interface Subject {
  id: string
  name: string
  icon: string | null
  display_order: number
}

// ========== コンテンツ ==========
export interface Content {
  id: string
  grade_level_id: string
  subject_id: string
  difficulty: number
  title: string
  body: string
  char_count: number
  reading_time_sec: number | null
  is_active: boolean
  display_order: number
  created_at: string
  updated_at: string
}

// ========== 4択テスト ==========
export interface Quiz {
  id: string
  content_id: string
  pattern: 'A' | 'B' | 'C'
  created_at: string
}

export interface QuizQuestion {
  id: string
  quiz_id: string
  question_no: number
  question_text: string
  choice_a: string
  choice_b: string
  choice_c: string
  choice_d: string
  correct: 'A' | 'B' | 'C' | 'D'
  explanation: string | null
}

// ========== 読書セッション ==========
export interface ReadingSession {
  id: string
  student_id: string
  content_id: string
  started_at: string
  finished_at: string | null
  reading_time_sec: number | null
  char_count: number
  wpm: number | null
  display_speed: number | null
  is_completed: boolean
  created_at: string
}

// ========== テスト結果 ==========
export interface QuizResult {
  id: string
  reading_session_id: string
  quiz_id: string
  student_id: string
  total_questions: number
  correct_count: number
  accuracy_pct: number
  answers: QuizAnswer[]
  completed_at: string
}

export interface QuizAnswer {
  question_no: number
  selected: string
  correct: string
  is_correct: boolean
}

// ========== 生徒プロファイル ==========
export interface StudentProfile {
  student_id: string
  grade_level_id: string
  current_wpm: number | null
  avg_wpm: number | null
  avg_accuracy_pct: number | null
  recommended_speed: number
  recommended_difficulty: number
  total_sessions: number
  total_contents_read: number
  last_session_at: string | null
  created_at: string
  updated_at: string
}

// ========== スピード履歴 ==========
export interface SpeedHistory {
  id: string
  student_id: string
  wpm: number
  accuracy_pct: number | null
  content_id: string | null
  measured_at: string
}

// ========== 表示用ラベル ==========
export const MEMBER_TYPE_LABELS: Record<MemberType, string> = {
  culture_kids: 'カルチャーキッズ会員',
  eduplus: 'エデュプラス会員',
  none: '非会員',
}

export const SCHOOL_STATUS_LABELS: Record<SchoolStatus, string> = {
  active: '本入会',
  trial: '体験中',
  cancelled: '解約済',
}

export const FORM_TYPE_LABELS: Record<FormType, string> = {
  contract: '契約',
  trial: '体験',
}

export const STUDENT_STATUS_LABELS: Record<StudentStatus, string> = {
  active: '利用中',
  inactive: '停止中',
}
