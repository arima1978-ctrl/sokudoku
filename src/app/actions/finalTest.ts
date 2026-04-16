'use server'

import { supabase } from '@/lib/supabase'
import {
  FINAL_TEST_PASS_THRESHOLD,
  FINAL_TEST_TOTAL_QUESTIONS,
  getTargetCount,
  isEligibleForFinalTest,
  isFinalTestPassed,
  type CoachStageNumber,
} from '@/lib/coach'

/**
 * ステージ修了テスト関連のServer Actions
 *
 * フロー:
 * 1. isFinalTestEligible() で受験資格チェック（最低回数+追加回数を消化したか）
 * 2. getFinalTestQuestions() でテスト問題取得
 * 3. submitFinalTest() で採点・合格時はステージアップ処理
 */

export interface FinalTestEligibility {
  eligible: boolean
  stageNumber: CoachStageNumber
  stageName: string
  sessionsCompleted: number
  sessionsRequired: number
  targetCount: number
  extraRequired: number
  lastAttemptAt: string | null
  attempts: number
}

/**
 * 生徒が修了テストを受験できるか判定
 */
export async function getFinalTestEligibility(
  studentId: string,
): Promise<FinalTestEligibility | null> {
  const { data: progress } = await supabase
    .from('student_progress')
    .select('coach_stage_id, stage_session_count, extra_sessions_required, stage_final_test_attempts, stage_final_test_passed')
    .eq('student_id', studentId)
    .single()

  if (!progress || !progress.coach_stage_id) return null

  const { data: stage } = await supabase
    .from('coach_stages')
    .select('id, name, stage_number, min_sessions')
    .eq('id', progress.coach_stage_id)
    .single()

  if (!stage) return null

  const { data: student } = await supabase
    .from('students')
    .select('grade_level_id')
    .eq('id', studentId)
    .single()

  const { data: lastTest } = await supabase
    .from('stage_final_tests')
    .select('attempted_at')
    .eq('student_id', studentId)
    .eq('coach_stage_id', progress.coach_stage_id)
    .order('attempted_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const extraRequired = progress.extra_sessions_required ?? 0
  const eligible = isEligibleForFinalTest(
    progress.stage_session_count,
    stage.min_sessions,
    extraRequired,
  )

  return {
    eligible: eligible && !progress.stage_final_test_passed,
    stageNumber: stage.stage_number as CoachStageNumber,
    stageName: stage.name,
    sessionsCompleted: progress.stage_session_count,
    sessionsRequired: stage.min_sessions + extraRequired,
    targetCount: getTargetCount(student?.grade_level_id),
    extraRequired,
    lastAttemptAt: lastTest?.attempted_at ?? null,
    attempts: progress.stage_final_test_attempts ?? 0,
  }
}

/**
 * 修了テストで使うコンテンツパックを選ぶ
 * - 生徒の学年レベルに合ったパック
 * - 速読基本コンテンツから選択
 * - 過去に修了テストで使ったものは除外（最近のもの）
 */
export async function pickFinalTestPack(studentId: string): Promise<{
  packId: string
  title: string
  body: string
  charCount: number
  questions: Array<{
    questionNo: number
    questionText: string
    choiceA: string
    choiceB: string
    choiceC: string
    choiceD: string
  }>
} | null> {
  const { data: student } = await supabase
    .from('students')
    .select('grade_level_id, school_id')
    .eq('id', studentId)
    .single()

  if (!student) return null

  // 共有パック or 自塾パック、学年一致、活性のもの
  const { data: packs } = await supabase
    .from('content_packs')
    .select('id, title')
    .eq('is_active', true)
    .eq('grade_level_id', student.grade_level_id)
    .eq('target_course', 'basic')
    .or(`owner_school_id.is.null,owner_school_id.eq.${student.school_id}`)
    .limit(20)

  if (!packs || packs.length === 0) return null

  // ランダム選択
  const chosen = packs[Math.floor(Math.random() * packs.length)]

  const [{ data: main }, { data: questions }] = await Promise.all([
    supabase.from('pack_main_texts').select('body, char_count').eq('pack_id', chosen.id).single(),
    supabase
      .from('pack_quiz_questions')
      .select('question_no, question_text, choice_a, choice_b, choice_c, choice_d')
      .eq('pack_id', chosen.id)
      .order('question_no', { ascending: true }),
  ])

  if (!main || !questions || questions.length !== FINAL_TEST_TOTAL_QUESTIONS) return null

  return {
    packId: chosen.id,
    title: chosen.title,
    body: main.body,
    charCount: main.char_count,
    questions: questions.map(q => ({
      questionNo: q.question_no,
      questionText: q.question_text,
      choiceA: q.choice_a,
      choiceB: q.choice_b,
      choiceC: q.choice_c,
      choiceD: q.choice_d,
    })),
  }
}

export interface FinalTestSubmitResult {
  passed: boolean
  correctCount: number
  totalQuestions: number
  achievedCount: number
  targetCount: number
  passThreshold: number
  reachedCountTarget: boolean
  reachedCorrectTarget: boolean
  nextStageUnlocked: boolean
}

/**
 * 修了テスト結果を送信して採点＋ステージアップ処理
 */
export async function submitFinalTest(params: {
  studentId: string
  packId: string
  achievedCount: number
  answers: Array<{ questionNo: number; selected: 'A' | 'B' | 'C' | 'D' }>
}): Promise<FinalTestSubmitResult> {
  const { studentId, packId, achievedCount, answers } = params

  // 生徒・ステージ情報取得
  const { data: progress } = await supabase
    .from('student_progress')
    .select('coach_stage_id, stage_final_test_attempts')
    .eq('student_id', studentId)
    .single()

  if (!progress || !progress.coach_stage_id) {
    throw new Error('生徒の進捗情報が見つかりません')
  }

  const { data: student } = await supabase
    .from('students')
    .select('grade_level_id')
    .eq('id', studentId)
    .single()

  const targetCount = getTargetCount(student?.grade_level_id)

  // 正解カウント
  const { data: correctAnswers } = await supabase
    .from('pack_quiz_questions')
    .select('question_no, correct')
    .eq('pack_id', packId)
    .order('question_no')

  if (!correctAnswers) throw new Error('問題データが見つかりません')

  let correctCount = 0
  for (const a of answers) {
    const q = correctAnswers.find(c => c.question_no === a.questionNo)
    if (q && q.correct === a.selected) correctCount++
  }

  const reachedCountTarget = achievedCount >= targetCount
  const reachedCorrectTarget = correctCount >= FINAL_TEST_PASS_THRESHOLD
  const passed = isFinalTestPassed(achievedCount, targetCount, correctCount)

  // 履歴に記録
  await supabase.from('stage_final_tests').insert({
    student_id: studentId,
    coach_stage_id: progress.coach_stage_id,
    target_count: targetCount,
    correct_count: correctCount,
    total_questions: FINAL_TEST_TOTAL_QUESTIONS,
    passed,
    pack_id: packId,
  })

  const newAttempts = (progress.stage_final_test_attempts ?? 0) + 1

  if (passed) {
    // 合格 → ステージアップ処理
    await handleStageUp(studentId, progress.coach_stage_id as string)
    return {
      passed: true,
      correctCount,
      totalQuestions: FINAL_TEST_TOTAL_QUESTIONS,
      achievedCount,
      targetCount,
      passThreshold: FINAL_TEST_PASS_THRESHOLD,
      reachedCountTarget,
      reachedCorrectTarget,
      nextStageUnlocked: true,
    }
  }

  // 不合格 → 追加2回トレーニング必要
  await supabase
    .from('student_progress')
    .update({
      stage_final_test_attempts: newAttempts,
      extra_sessions_required: (progress as { extra_sessions_required?: number }).extra_sessions_required !== undefined
        ? ((progress as { extra_sessions_required?: number }).extra_sessions_required ?? 0) + 2
        : 2,
    })
    .eq('student_id', studentId)

  return {
    passed: false,
    correctCount,
    totalQuestions: FINAL_TEST_TOTAL_QUESTIONS,
    achievedCount,
    targetCount,
    passThreshold: FINAL_TEST_PASS_THRESHOLD,
    reachedCountTarget,
    reachedCorrectTarget,
    nextStageUnlocked: false,
  }
}

/**
 * ステージアップ処理
 * - coach_stage_id を次のステージへ
 * - stage_session_count をリセット
 * - 達成カウンタをリセット
 */
async function handleStageUp(studentId: string, currentStageId: string): Promise<void> {
  const { data: currentStage } = await supabase
    .from('coach_stages')
    .select('stage_number')
    .eq('id', currentStageId)
    .single()

  if (!currentStage) return

  const nextStageNumber = currentStage.stage_number + 1

  // 次のステージ（Stage 5 クリア後は Stage 5 のまま留まる）
  if (nextStageNumber > 5) {
    // Stage 5 完了: 再度 Stage 5 を続けるが passed フラグは true のまま
    // （本読みトレーニング廃止のため、Stage 5 を続ける）
    return
  }

  const nextStageId = `stage_${nextStageNumber}`

  await supabase
    .from('student_progress')
    .update({
      coach_stage_id: nextStageId,
      stage_session_count: 0,
      stage_final_test_passed: false,
      stage_final_test_attempts: 0,
      extra_sessions_required: 0,
      block_240_cleared: 0,
      block_accuracy_90: 0,
    })
    .eq('student_id', studentId)
}
