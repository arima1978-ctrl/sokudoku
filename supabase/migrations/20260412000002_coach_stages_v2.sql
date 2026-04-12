-- ============================================================
-- コーチステージ v2: ステージ構成・進級条件の修正
-- ============================================================
-- 変更点:
-- 1. coach_stages の min_sessions / segment_types を更新
-- 2. student_progress: fluency_reported → block_240_cleared (ブロック読み240カウント突破)
-- 3. student_progress: block_accuracy_90 追加 (正答率90%以上)
-- 4. evaluate_coach_stage_up() を新条件で書き換え
-- ============================================================


-- ========== 1. coach_stages 更新 ==========
UPDATE coach_stages SET
  min_sessions = 6,
  segment_types = ARRAY['barabara', 'shunkan_tate_1line', 'shunkan_yoko_1line', 'shunkan_tate_2line', 'shunkan_yoko_2line', 'block_tate', 'block_yoko'],
  description = 'ばらばら → 1行読み → 2行読み → ブロック読み'
WHERE id = 'stage_1';

UPDATE coach_stages SET
  min_sessions = 8,
  segment_types = ARRAY['barabara', 'shunkan_tate_1line', 'shunkan_yoko_1line', 'shunkan_tate_2line', 'shunkan_yoko_2line', 'block_tate', 'block_yoko'],
  description = 'ばらばら → 1行or2行(交互) → ブロック読み'
WHERE id = 'stage_2';

UPDATE coach_stages SET
  min_sessions = 8,
  segment_types = ARRAY['shunkan_tate_1line', 'shunkan_yoko_1line', 'shunkan_tate_2line', 'shunkan_yoko_2line', 'block_tate', 'block_yoko'],
  description = '1行読み → 2行読み → ブロック読み'
WHERE id = 'stage_3';

UPDATE coach_stages SET
  min_sessions = 8,
  segment_types = ARRAY['barabara', 'block_tate', 'block_yoko', 'shiten_ido'],
  description = 'ばらばら → ブロック読み → 視点移動'
WHERE id = 'stage_4';

UPDATE coach_stages SET
  min_sessions = 8,
  segment_types = ARRAY['block_tate', 'block_yoko', 'shiten_ido'],
  description = 'ブロック読み → 視点移動'
WHERE id = 'stage_5';


-- ========== 2. student_progress カラム変更 ==========
-- fluency_reported → block_240_cleared (ブロック読み240カウント突破フラグ)
ALTER TABLE student_progress
  ADD COLUMN IF NOT EXISTS block_240_cleared BOOLEAN NOT NULL DEFAULT false;

-- 正答率90%以上達成フラグ
ALTER TABLE student_progress
  ADD COLUMN IF NOT EXISTS block_accuracy_90 BOOLEAN NOT NULL DEFAULT false;

-- 旧 fluency_reported は残すが新ロジックでは使わない
-- (既存データ互換のため DROP しない)


-- ========== 3. evaluate_coach_stage_up() 書き換え ==========
CREATE OR REPLACE FUNCTION evaluate_coach_stage_up(
  p_student_id UUID,
  p_direction TEXT        -- 今回のトレーニング方向 ('tate' or 'yoko')
) RETURNS JSONB AS $$
DECLARE
  v_progress RECORD;
  v_stage RECORD;
  v_next_stage RECORD;
  v_action TEXT := 'maintain';
  v_new_stage_id TEXT;
BEGIN
  -- 現在の進行状況を取得
  SELECT coach_stage_id, stage_session_count, stage_direction_last,
         block_240_cleared, block_accuracy_90
    INTO v_progress
    FROM student_progress
   WHERE student_id = p_student_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('action', 'not_found');
  END IF;

  -- 現在のステージ情報を取得
  SELECT * INTO v_stage FROM coach_stages WHERE id = v_progress.coach_stage_id;

  v_new_stage_id := v_progress.coach_stage_id;

  -- セッションカウント+1、方向を更新
  UPDATE student_progress SET
    stage_session_count = stage_session_count + 1,
    stage_direction_last = p_direction,
    updated_at = now()
  WHERE student_id = p_student_id;

  -- ステージアップ判定:
  -- 条件1: 最低回数を満たしている（+1後）
  -- 条件2: ブロック読みで240カウント突破済み
  -- 条件3: ブロック読みで正答率90%以上達成済み
  IF (v_progress.stage_session_count + 1) >= v_stage.min_sessions
     AND v_progress.block_240_cleared = true
     AND v_progress.block_accuracy_90 = true THEN

    -- 次のステージを探す
    SELECT * INTO v_next_stage FROM coach_stages
     WHERE stage_number > v_stage.stage_number
     ORDER BY stage_number LIMIT 1;

    IF FOUND THEN
      v_new_stage_id := v_next_stage.id;
      v_action := 'stage_up';

      -- ステージアップ: カウンター・フラグリセット
      UPDATE student_progress SET
        coach_stage_id = v_new_stage_id,
        stage_session_count = 0,
        block_240_cleared = false,
        block_accuracy_90 = false,
        updated_at = now()
      WHERE student_id = p_student_id;
    ELSE
      v_action := 'max_stage';
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'action', v_action,
    'previous_stage', v_progress.coach_stage_id,
    'new_stage', v_new_stage_id,
    'stage_name', CASE WHEN v_action = 'stage_up' THEN v_next_stage.name ELSE v_stage.name END,
    'session_count', v_progress.stage_session_count + 1,
    'min_sessions', v_stage.min_sessions,
    'block_240_cleared', v_progress.block_240_cleared,
    'block_accuracy_90', v_progress.block_accuracy_90
  );
END;
$$ LANGUAGE plpgsql;


-- ========== 4. initialize_student_progress 更新 ==========
CREATE OR REPLACE FUNCTION initialize_student_progress(
  p_student_id UUID
) RETURNS VOID AS $$
BEGIN
  INSERT INTO student_progress (
    student_id, current_phase_id, current_step_id,
    coach_stage_id, stage_session_count, stage_direction_last,
    fluency_reported, block_240_cleared, block_accuracy_90
  )
  VALUES (
    p_student_id, 'shunkan', 'shunkan_tate_1line_lv1',
    'stage_1', 0, 'yoko',
    false, false, false
  )
  ON CONFLICT (student_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql;
