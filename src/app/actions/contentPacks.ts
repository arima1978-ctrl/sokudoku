'use server'

import { supabase } from '@/lib/supabase'

export interface SubjectOption {
  id: string
  name: string
  icon: string | null
  ownerSchoolId: string | null
}

export interface GradeLevelOption {
  id: string
  name: string
  displayOrder: number
}

export async function getSubjectsAndGrades(): Promise<{
  subjects: SubjectOption[]
  grades: GradeLevelOption[]
}> {
  const [sRes, gRes] = await Promise.all([
    supabase.from('subjects').select('*').order('display_order'),
    supabase.from('grade_levels').select('*').order('display_order'),
  ])

  return {
    subjects: (sRes.data ?? []).map((s) => ({
      id: s.id,
      name: s.name,
      icon: s.icon,
      ownerSchoolId: s.owner_school_id,
    })),
    grades: (gRes.data ?? []).map((g) => ({
      id: g.id,
      name: g.name ?? g.id,
      displayOrder: g.display_order,
    })),
  }
}

export interface ContentPackSummary {
  id: string
  title: string
  targetCourse: 'basic' | 'genre'
  koeE: 'koe' | 'e' | null
  subjectId: string | null
  subjectName: string | null
  gradeLevelId: string
  difficulty: number
  ownerSchoolId: string | null
  isActive: boolean
  barabaraCount: number
  line1Count: number
  line2Count: number
  hasMainText: boolean
  quizCount: number
}

export interface ContentPackDetail extends ContentPackSummary {
  barabaraWords: Array<{ id: string; word: string; isDecoy: boolean }>
  line1Texts: Array<{ id: string; lineText: string }>
  line2Pairs: Array<{ id: string; pairNo: number; line1: string; line2: string }>
  mainBody: string | null
  mainCharCount: number
  quizzes: Array<{
    id: string
    questionNo: number
    questionText: string
    choiceA: string
    choiceB: string
    choiceC: string
    choiceD: string
    correct: 'A' | 'B' | 'C' | 'D'
    explanation: string | null
  }>
}

/**
 * コンテンツパック一覧取得
 */
export async function listContentPacks(params: {
  targetCourse?: 'basic' | 'genre'
  ownerSchoolId?: string | null
  subjectId?: string
  gradeLevelId?: string
  showInactive?: boolean
} = {}): Promise<ContentPackSummary[]> {
  let query = supabase
    .from('content_packs')
    .select(`
      id, title, target_course, koe_e, subject_id, grade_level_id, difficulty, owner_school_id, is_active,
      subjects:subject_id (name)
    `)
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: false })

  if (params.targetCourse) query = query.eq('target_course', params.targetCourse)
  if (params.ownerSchoolId !== undefined) {
    if (params.ownerSchoolId === null) query = query.is('owner_school_id', null)
    else query = query.eq('owner_school_id', params.ownerSchoolId)
  }
  if (params.subjectId) query = query.eq('subject_id', params.subjectId)
  if (params.gradeLevelId) query = query.eq('grade_level_id', params.gradeLevelId)
  if (!params.showInactive) query = query.eq('is_active', true)

  const { data, error } = await query
  if (error) throw error

  // 各パックの子レコード数をカウント
  const ids = (data ?? []).map(p => p.id)
  const counts = await getChildCounts(ids)

  return (data ?? []).map(p => ({
    id: p.id,
    title: p.title,
    targetCourse: p.target_course as 'basic' | 'genre',
    koeE: p.koe_e as 'koe' | 'e' | null,
    subjectId: p.subject_id,
    subjectName: (p.subjects as { name?: string } | null)?.name ?? null,
    gradeLevelId: p.grade_level_id,
    difficulty: p.difficulty,
    ownerSchoolId: p.owner_school_id,
    isActive: p.is_active,
    barabaraCount: counts[p.id]?.barabara ?? 0,
    line1Count: counts[p.id]?.line1 ?? 0,
    line2Count: counts[p.id]?.line2 ?? 0,
    hasMainText: counts[p.id]?.hasMain ?? false,
    quizCount: counts[p.id]?.quiz ?? 0,
  }))
}

async function getChildCounts(packIds: string[]): Promise<Record<string, { barabara: number; line1: number; line2: number; hasMain: boolean; quiz: number }>> {
  if (packIds.length === 0) return {}

  const [barabara, line1, line2, main, quiz] = await Promise.all([
    supabase.from('pack_barabara_words').select('pack_id').in('pack_id', packIds),
    supabase.from('pack_line1_texts').select('pack_id').in('pack_id', packIds),
    supabase.from('pack_line2_pairs').select('pack_id').in('pack_id', packIds),
    supabase.from('pack_main_texts').select('pack_id').in('pack_id', packIds),
    supabase.from('pack_quiz_questions').select('pack_id').in('pack_id', packIds),
  ])

  const result: Record<string, { barabara: number; line1: number; line2: number; hasMain: boolean; quiz: number }> = {}
  for (const id of packIds) {
    result[id] = { barabara: 0, line1: 0, line2: 0, hasMain: false, quiz: 0 }
  }
  for (const r of barabara.data ?? []) result[r.pack_id].barabara++
  for (const r of line1.data ?? []) result[r.pack_id].line1++
  for (const r of line2.data ?? []) result[r.pack_id].line2++
  for (const r of main.data ?? []) result[r.pack_id].hasMain = true
  for (const r of quiz.data ?? []) result[r.pack_id].quiz++
  return result
}

/**
 * コンテンツパック詳細取得
 */
export async function getContentPack(packId: string): Promise<ContentPackDetail | null> {
  const { data: pack } = await supabase
    .from('content_packs')
    .select(`id, title, target_course, koe_e, subject_id, grade_level_id, difficulty, owner_school_id, is_active, subjects:subject_id (name)`)
    .eq('id', packId)
    .single()

  if (!pack) return null

  const [barabara, line1, line2, main, quiz] = await Promise.all([
    supabase.from('pack_barabara_words').select('id, word, is_decoy').eq('pack_id', packId).order('display_order'),
    supabase.from('pack_line1_texts').select('id, line_text').eq('pack_id', packId).order('display_order'),
    supabase.from('pack_line2_pairs').select('id, pair_no, line1, line2').eq('pack_id', packId).order('pair_no'),
    supabase.from('pack_main_texts').select('body, char_count').eq('pack_id', packId).maybeSingle(),
    supabase.from('pack_quiz_questions').select('*').eq('pack_id', packId).order('question_no'),
  ])

  return {
    id: pack.id,
    title: pack.title,
    targetCourse: pack.target_course as 'basic' | 'genre',
    koeE: pack.koe_e as 'koe' | 'e' | null,
    subjectId: pack.subject_id,
    subjectName: (pack.subjects as { name?: string } | null)?.name ?? null,
    gradeLevelId: pack.grade_level_id,
    difficulty: pack.difficulty,
    ownerSchoolId: pack.owner_school_id,
    isActive: pack.is_active,
    barabaraCount: (barabara.data ?? []).length,
    line1Count: (line1.data ?? []).length,
    line2Count: (line2.data ?? []).length,
    hasMainText: !!main.data,
    quizCount: (quiz.data ?? []).length,
    barabaraWords: (barabara.data ?? []).map(r => ({ id: r.id, word: r.word, isDecoy: r.is_decoy })),
    line1Texts: (line1.data ?? []).map(r => ({ id: r.id, lineText: r.line_text })),
    line2Pairs: (line2.data ?? []).map(r => ({ id: r.id, pairNo: r.pair_no, line1: r.line1, line2: r.line2 })),
    mainBody: main.data?.body ?? null,
    mainCharCount: main.data?.char_count ?? 0,
    quizzes: (quiz.data ?? []).map(q => ({
      id: q.id,
      questionNo: q.question_no,
      questionText: q.question_text,
      choiceA: q.choice_a,
      choiceB: q.choice_b,
      choiceC: q.choice_c,
      choiceD: q.choice_d,
      correct: q.correct as 'A' | 'B' | 'C' | 'D',
      explanation: q.explanation,
    })),
  }
}

export interface CreatePackInput {
  title: string
  targetCourse: 'basic' | 'genre'
  koeE?: 'koe' | 'e' | null
  subjectId?: string | null
  gradeLevelId: string
  difficulty: number
  ownerSchoolId: string | null
}

/**
 * コンテンツパック新規作成（空のパック）
 */
export async function createContentPack(input: CreatePackInput): Promise<{ id: string }> {
  const { data, error } = await supabase
    .from('content_packs')
    .insert({
      title: input.title,
      target_course: input.targetCourse,
      koe_e: input.koeE ?? null,
      subject_id: input.subjectId ?? null,
      grade_level_id: input.gradeLevelId,
      difficulty: input.difficulty,
      owner_school_id: input.ownerSchoolId,
      is_active: true,
    })
    .select('id')
    .single()

  if (error) throw error
  return { id: data.id }
}

export interface UpdatePackInput {
  packId: string
  title?: string
  targetCourse?: 'basic' | 'genre'
  koeE?: 'koe' | 'e' | null
  subjectId?: string | null
  gradeLevelId?: string
  difficulty?: number
  isActive?: boolean
}

export async function updateContentPack(input: UpdatePackInput): Promise<void> {
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (input.title !== undefined) updates.title = input.title
  if (input.targetCourse !== undefined) updates.target_course = input.targetCourse
  if (input.koeE !== undefined) updates.koe_e = input.koeE
  if (input.subjectId !== undefined) updates.subject_id = input.subjectId
  if (input.gradeLevelId !== undefined) updates.grade_level_id = input.gradeLevelId
  if (input.difficulty !== undefined) updates.difficulty = input.difficulty
  if (input.isActive !== undefined) updates.is_active = input.isActive

  const { error } = await supabase
    .from('content_packs')
    .update(updates)
    .eq('id', input.packId)
  if (error) throw error
}

export async function deleteContentPack(packId: string): Promise<void> {
  const { error } = await supabase.from('content_packs').delete().eq('id', packId)
  if (error) throw error
}

// ========== 子レコードのバルクアップデート ==========

export async function replaceBarabaraWords(packId: string, words: Array<{ word: string; isDecoy: boolean }>): Promise<void> {
  await supabase.from('pack_barabara_words').delete().eq('pack_id', packId)
  if (words.length > 0) {
    const rows = words.map((w, i) => ({
      pack_id: packId,
      word: w.word,
      is_decoy: w.isDecoy,
      display_order: i,
    }))
    await supabase.from('pack_barabara_words').insert(rows)
  }
}

export async function replaceLine1Texts(packId: string, texts: string[]): Promise<void> {
  await supabase.from('pack_line1_texts').delete().eq('pack_id', packId)
  if (texts.length > 0) {
    const rows = texts.map((t, i) => ({ pack_id: packId, line_text: t, display_order: i }))
    await supabase.from('pack_line1_texts').insert(rows)
  }
}

export async function replaceLine2Pairs(packId: string, pairs: Array<{ line1: string; line2: string }>): Promise<void> {
  await supabase.from('pack_line2_pairs').delete().eq('pack_id', packId)
  if (pairs.length > 0) {
    const rows = pairs.map((p, i) => ({ pack_id: packId, pair_no: i + 1, line1: p.line1, line2: p.line2 }))
    await supabase.from('pack_line2_pairs').insert(rows)
  }
}

export async function replaceMainText(packId: string, body: string): Promise<void> {
  await supabase.from('pack_main_texts').delete().eq('pack_id', packId)
  await supabase.from('pack_main_texts').insert({
    pack_id: packId,
    body,
    char_count: body.length,
  })
}

export interface QuizInput {
  questionNo: number
  questionText: string
  choiceA: string
  choiceB: string
  choiceC: string
  choiceD: string
  correct: 'A' | 'B' | 'C' | 'D'
  explanation?: string
}

export async function replaceQuizzes(packId: string, quizzes: QuizInput[]): Promise<void> {
  await supabase.from('pack_quiz_questions').delete().eq('pack_id', packId)
  if (quizzes.length > 0) {
    const rows = quizzes.map(q => ({
      pack_id: packId,
      question_no: q.questionNo,
      question_text: q.questionText,
      choice_a: q.choiceA,
      choice_b: q.choiceB,
      choice_c: q.choiceC,
      choice_d: q.choiceD,
      correct: q.correct,
      explanation: q.explanation ?? null,
    }))
    await supabase.from('pack_quiz_questions').insert(rows)
  }
}
