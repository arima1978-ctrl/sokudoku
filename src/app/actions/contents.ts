'use server'

import { supabase } from '@/lib/supabase'
import { getLoggedInAdmin } from '@/lib/adminAuth'

export interface ContentRow {
  id: string
  title: string
  body: string
  char_count: number
  grade_level_id: string | null
  subject_id: string | null
  difficulty: number | null
  is_active: boolean
  owner_school_id: string | null
  recognition_in_words: string[]
  recognition_decoy_words: string[]
  created_at: string
  updated_at: string
}

export interface ContentListFilters {
  search?: string
  gradeLevelId?: string
  subjectId?: string
  onlyMine?: boolean
}

/** ログイン中管理者の権限に応じたコンテンツ一覧 */
export async function listContentsForAdmin(
  filters: ContentListFilters = {},
): Promise<ContentRow[]> {
  const admin = await getLoggedInAdmin()
  if (!admin) return []

  let query = supabase
    .from('contents')
    .select('id, title, body, char_count, grade_level_id, subject_id, difficulty, is_active, owner_school_id, recognition_in_words, recognition_decoy_words, created_at, updated_at')
    .order('updated_at', { ascending: false })
    .limit(200)

  // 塾管理者: 自塾登録 + 運用管理者登録(owner NULL) のみ。
  // onlyMine=true なら自塾登録のみ。
  if (admin.role === 'school') {
    if (filters.onlyMine) {
      query = query.eq('owner_school_id', admin.id!)
    } else {
      query = query.or(`owner_school_id.is.null,owner_school_id.eq.${admin.id}`)
    }
  }
  // platform: 全件

  if (filters.search) {
    query = query.ilike('title', `%${filters.search}%`)
  }
  if (filters.gradeLevelId) {
    query = query.eq('grade_level_id', filters.gradeLevelId)
  }
  if (filters.subjectId) {
    query = query.eq('subject_id', filters.subjectId)
  }

  const { data, error } = await query
  if (error || !data) return []
  return data as ContentRow[]
}

export async function getContentById(id: string): Promise<ContentRow | null> {
  const { data, error } = await supabase
    .from('contents')
    .select('id, title, body, char_count, grade_level_id, subject_id, difficulty, is_active, owner_school_id, recognition_in_words, recognition_decoy_words, created_at, updated_at')
    .eq('id', id)
    .maybeSingle()
  if (error || !data) return null
  return data as ContentRow
}

export interface ContentInput {
  title: string
  body: string
  grade_level_id?: string | null
  subject_id?: string | null
  difficulty?: number | null
  is_active?: boolean
  recognition_in_words: string[]
  recognition_decoy_words: string[]
}

export async function createContent(input: ContentInput): Promise<{ success: boolean; id?: string; error?: string }> {
  const admin = await getLoggedInAdmin()
  if (!admin) return { success: false, error: '未ログイン' }

  if (!input.title.trim() || !input.body.trim()) {
    return { success: false, error: 'タイトルと本文は必須です' }
  }

  const ownerSchoolId = admin.role === 'platform' ? null : admin.id

  const { data, error } = await supabase
    .from('contents')
    .insert({
      title: input.title.trim(),
      body: input.body,
      char_count: input.body.replace(/\s+/g, '').length,
      grade_level_id: input.grade_level_id ?? null,
      subject_id: input.subject_id ?? null,
      difficulty: input.difficulty ?? null,
      is_active: input.is_active ?? true,
      owner_school_id: ownerSchoolId,
      recognition_in_words: input.recognition_in_words,
      recognition_decoy_words: input.recognition_decoy_words,
    })
    .select('id')
    .single()

  if (error || !data) return { success: false, error: error?.message ?? '作成失敗' }
  return { success: true, id: (data as { id: string }).id }
}

export async function updateContent(id: string, input: ContentInput): Promise<{ success: boolean; error?: string }> {
  const admin = await getLoggedInAdmin()
  if (!admin) return { success: false, error: '未ログイン' }

  // 権限チェック: 塾管理者は自塾登録分のみ編集可
  const existing = await getContentById(id)
  if (!existing) return { success: false, error: 'コンテンツが見つかりません' }
  if (admin.role === 'school') {
    if (existing.owner_school_id !== admin.id) {
      return { success: false, error: 'このコンテンツを編集する権限がありません' }
    }
  }

  const { error } = await supabase
    .from('contents')
    .update({
      title: input.title.trim(),
      body: input.body,
      char_count: input.body.replace(/\s+/g, '').length,
      grade_level_id: input.grade_level_id ?? null,
      subject_id: input.subject_id ?? null,
      difficulty: input.difficulty ?? null,
      is_active: input.is_active ?? true,
      recognition_in_words: input.recognition_in_words,
      recognition_decoy_words: input.recognition_decoy_words,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function deleteContent(id: string): Promise<{ success: boolean; error?: string }> {
  const admin = await getLoggedInAdmin()
  if (!admin) return { success: false, error: '未ログイン' }

  const existing = await getContentById(id)
  if (!existing) return { success: false, error: 'コンテンツが見つかりません' }
  if (admin.role === 'school') {
    if (existing.owner_school_id !== admin.id) {
      return { success: false, error: 'このコンテンツを削除する権限がありません' }
    }
  }

  const { error } = await supabase.from('contents').delete().eq('id', id)
  if (error) return { success: false, error: error.message }
  return { success: true }
}
