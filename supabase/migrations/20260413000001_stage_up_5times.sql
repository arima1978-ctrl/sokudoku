-- ============================================================
-- ステージアップ条件: 5回達成に変更 + Stage4-5視点移動比率 + Stage5後フロー
-- ============================================================
-- 変更点:
-- 1. block_240_cleared: BOOLEAN → INT (達成回数、5回でクリア)
-- 2. block_accuracy_90: BOOLEAN → INT (達成回数、5回でクリア)
-- 3. evaluate_coach_stage_up() を5回条件に書き換え
-- 4. student_progress に speed_mode BOOLEAN 追加 (Stage5完了後のスピードモード)
-- ============================================================


-- ========== 1. カラム型変更 (BOOLEAN → INT) ==========
-- DEFAULTを先にDROPしてから型変更
ALTER TABLE student_progress ALTER COLUMN block_240_cleared DROP DEFAULT;
ALTER TABLE student_progress ALTER COLUMN block_accuracy_90 DROP DEFAULT;

ALTER TABLE student_progress
  ALTER COLUMN block_240_cleared TYPE INT USING (CASE WHEN block_240_cleared THEN 1 ELSE 0 END);

ALTER TABLE student_progress
  ALTER COLUMN block_accuracy_90 TYPE INT USING (CASE WHEN block_accuracy_90 THEN 1 ELSE 0 END);

ALTER TABLE student_progress ALTER COLUMN block_240_cleared SET DEFAULT 0;
ALTER TABLE student_progress ALTER COLUMN block_accuracy_90 SET DEFAULT 0;

-- Stage5完了後のスピードモードフラグ
ALTER TABLE student_progress
  ADD COLUMN IF NOT EXISTS speed_mode BOOLEAN NOT NULL DEFAULT false;


-- ========== 2. evaluate_coach_stage_up() 書き換え ==========
CREATE OR REPLACE FUNCTION evaluate_coach_stage_up(
  p_student_id UUID,
  p_direction TEXT
) RETURNS JSONB AS $$
DECLARE
  v_progress RECORD;
  v_stage RECORD;
  v_next_stage RECORD;
  v_action TEXT := 'maintain';
  v_new_stage_id TEXT;
  v_required_clears INT := 5; -- 5回達成で条件クリア
BEGIN
  SELECT coach_stage_id, stage_session_count, stage_direction_last,
         block_240_cleared, block_accuracy_90, speed_mode
    INTO v_progress
    FROM student_progress
   WHERE student_id = p_student_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('action', 'not_found');
  END IF;

  SELECT * INTO v_stage FROM coach_stages WHERE id = v_progress.coach_stage_id;

  v_new_stage_id := v_progress.coach_stage_id;

  -- セッションカウント+1、方向を更新
  UPDATE student_progress SET
    stage_session_count = stage_session_count + 1,
    stage_direction_last = p_direction,
    updated_at = now()
  WHERE student_id = p_student_id;

  -- スピードモード中はステージ変更なし
  IF v_progress.speed_mode = true THEN
    RETURN jsonb_build_object(
      'action', 'speed_mode',
      'previous_stage', v_progress.coach_stage_id,
      'new_stage', v_progress.coach_stage_id,
      'stage_name', v_stage.name,
      'session_count', v_progress.stage_session_count + 1,
      'min_sessions', v_stage.min_sessions,
      'block_240_count', v_progress.block_240_cleared,
      'block_90_count', v_progress.block_accuracy_90,
      'required_clears', v_required_clears
    );
  END IF;

  -- ステージアップ判定:
  -- 条件1: 最低回数を満たしている
  -- 条件2: ブロック読み240カウント突破が5回以上
  -- 条件3: ブロック読み正答率90%以上が5回以上
  IF (v_progress.stage_session_count + 1) >= v_stage.min_sessions
     AND v_progress.block_240_cleared >= v_required_clears
     AND v_progress.block_accuracy_90 >= v_required_clears THEN

    SELECT * INTO v_next_stage FROM coach_stages
     WHERE stage_number > v_stage.stage_number
     ORDER BY stage_number LIMIT 1;

    IF FOUND THEN
      v_new_stage_id := v_next_stage.id;
      v_action := 'stage_up';

      UPDATE student_progress SET
        coach_stage_id = v_new_stage_id,
        stage_session_count = 0,
        block_240_cleared = 0,
        block_accuracy_90 = 0,
        updated_at = now()
      WHERE student_id = p_student_id;
    ELSE
      -- 最終ステージ完了 → スピードモードへ移行
      v_action := 'speed_mode_start';

      UPDATE student_progress SET
        speed_mode = true,
        stage_session_count = 0,
        block_240_cleared = 0,
        block_accuracy_90 = 0,
        updated_at = now()
      WHERE student_id = p_student_id;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'action', v_action,
    'previous_stage', v_progress.coach_stage_id,
    'new_stage', v_new_stage_id,
    'stage_name', CASE WHEN v_action = 'stage_up' THEN v_next_stage.name ELSE v_stage.name END,
    'session_count', v_progress.stage_session_count + 1,
    'min_sessions', v_stage.min_sessions,
    'block_240_count', v_progress.block_240_cleared,
    'block_90_count', v_progress.block_accuracy_90,
    'required_clears', v_required_clears
  );
END;
$$ LANGUAGE plpgsql;


-- ========== 3. initialize_student_progress 更新 ==========
CREATE OR REPLACE FUNCTION initialize_student_progress(
  p_student_id UUID
) RETURNS VOID AS $$
BEGIN
  INSERT INTO student_progress (
    student_id, current_phase_id, current_step_id,
    coach_stage_id, stage_session_count, stage_direction_last,
    fluency_reported, block_240_cleared, block_accuracy_90, speed_mode
  )
  VALUES (
    p_student_id, 'shunkan', 'shunkan_tate_1line_lv1',
    'stage_1', 0, 'yoko',
    false, 0, 0, false
  )
  ON CONFLICT (student_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql;
