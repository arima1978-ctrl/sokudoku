export interface Database {
  public: {
    Tables: {
      jukus: {
        Row: Juku
        Insert: JukuInsert
        Update: JukuUpdate
        Relationships: []
      }
      students: {
        Row: Student
        Insert: StudentInsert
        Update: StudentUpdate
        Relationships: [
          {
            foreignKeyName: 'students_juku_id_fkey'
            columns: ['juku_id']
            isOneToOne: false
            referencedRelation: 'jukus'
            referencedColumns: ['id']
          }
        ]
      }
      login_history: {
        Row: LoginHistory
        Insert: LoginHistoryInsert
        Update: LoginHistoryInsert
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

// ========== 塾 ==========
export interface Juku {
  id: string
  juku_id: string
  family_code: string
  juku_name: string
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

export type JukuInsert = Omit<Juku, 'id' | 'created_at' | 'updated_at'> & {
  id?: string
  created_at?: string
  updated_at?: string
}

export type JukuUpdate = Partial<JukuInsert>

export type MemberType = 'culture_kids' | 'eduplus' | 'none'
export type JukuStatus = 'active' | 'trial' | 'cancelled'
export type FormType = 'contract' | 'trial'

// ========== 生徒 ==========
export interface Student {
  id: string
  juku_id: string
  student_login_id: string
  student_password: string
  student_name: string | null
  grade: string | null
  status: string
  start_date: string | null
  end_date: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type StudentInsert = Omit<Student, 'id' | 'created_at' | 'updated_at'> & {
  id?: string
  created_at?: string
  updated_at?: string
}

export type StudentUpdate = Partial<StudentInsert>

export type StudentStatus = 'active' | 'inactive'

// ========== ログイン履歴 ==========
export interface LoginHistory {
  id: string
  juku_id: string | null
  student_id: string | null
  login_type: string
  logged_in_at: string
  ip_address: string | null
  user_agent: string | null
}

export type LoginHistoryInsert = Omit<LoginHistory, 'id' | 'logged_in_at'> & {
  id?: string
  logged_in_at?: string
}

// ========== 表示用ラベル ==========
export const MEMBER_TYPE_LABELS: Record<MemberType, string> = {
  culture_kids: 'カルチャーキッズ会員',
  eduplus: 'エデュプラス会員',
  none: '非会員',
}

export const JUKU_STATUS_LABELS: Record<JukuStatus, string> = {
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
