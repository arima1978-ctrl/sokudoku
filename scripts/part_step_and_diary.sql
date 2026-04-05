-- ステップアップ基準を80%に変更 + 感想日記テーブル追加

-- evaluate_step_up 関数を80%基準に更新
CREATE OR REPLACE FUNCTION evaluate_step_up(
  p_student_id UUID,
  p_accuracy_pct NUMERIC
) RETURNS JSONB AS $$
DECLARE
  v_progress student_progress%ROWTYPE;
  v_current_step training_steps%ROWTYPE;
  v_next_step training_steps%ROWTYPE;
  v_next_phase_step training_steps%ROWTYPE;
  v_action TEXT := 'maintain';
  v_new_step_id TEXT;
  v_new_phase_id TEXT;
BEGIN
  SELECT * INTO v_progress FROM student_progress WHERE student_id = p_student_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('action', 'not_found');
  END IF;

  SELECT * INTO v_current_step FROM training_steps WHERE id = v_progress.current_step_id;

  -- カウンター更新（80%基準）
  IF p_accuracy_pct >= 80 THEN
    v_progress.consecutive_pass_count := v_progress.consecutive_pass_count + 1;
    v_progress.consecutive_fail_count := 0;
  ELSIF p_accuracy_pct >= 60 THEN
    v_progress.consecutive_pass_count := 0;
    v_progress.consecutive_fail_count := 0;
  ELSE
    v_progress.consecutive_pass_count := 0;
    v_progress.consecutive_fail_count := v_progress.consecutive_fail_count + 1;
  END IF;

  v_new_step_id := v_progress.current_step_id;
  v_new_phase_id := v_progress.current_phase_id;

  -- 80%以上で次のステップへ（即時進行）
  IF p_accuracy_pct >= 80 THEN
    SELECT * INTO v_next_step FROM training_steps
      WHERE phase_id = v_current_step.phase_id
        AND display_order > v_current_step.display_order
      ORDER BY display_order LIMIT 1;

    IF FOUND THEN
      v_new_step_id := v_next_step.id;
      v_action := 'step_up';
    ELSE
      SELECT * INTO v_next_phase_step FROM training_steps ts
        JOIN training_phases tp ON ts.phase_id = tp.id
        WHERE tp.phase_number > (SELECT phase_number FROM training_phases WHERE id = v_current_step.phase_id)
        ORDER BY tp.phase_number, ts.display_order LIMIT 1;
      IF FOUND THEN
        v_new_step_id := v_next_phase_step.id;
        v_new_phase_id := v_next_phase_step.phase_id;
        v_action := 'phase_up';
      END IF;
    END IF;

  -- 60%未満×2回連続で1段階ダウン
  ELSIF v_progress.consecutive_fail_count >= 2 THEN
    SELECT * INTO v_next_step FROM training_steps
      WHERE phase_id = v_current_step.phase_id
        AND display_order < v_current_step.display_order
      ORDER BY display_order DESC LIMIT 1;

    IF FOUND THEN
      v_new_step_id := v_next_step.id;
      v_action := 'step_down';
    END IF;
  END IF;

  -- 進行状況を更新
  UPDATE student_progress SET
    current_phase_id = v_new_phase_id,
    current_step_id = v_new_step_id,
    consecutive_pass_count = CASE WHEN v_action != 'maintain' THEN 0 ELSE v_progress.consecutive_pass_count END,
    consecutive_fail_count = CASE WHEN v_action != 'maintain' THEN 0 ELSE v_progress.consecutive_fail_count END,
    consecutive_excellent = 0,
    total_training_count = v_progress.total_training_count + 1,
    last_training_at = now(),
    step_started_at = CASE WHEN v_action != 'maintain' THEN now() ELSE v_progress.step_started_at END,
    phase_started_at = CASE WHEN v_action = 'phase_up' THEN now() ELSE v_progress.phase_started_at END,
    updated_at = now()
  WHERE student_id = p_student_id;

  RETURN jsonb_build_object(
    'action', v_action,
    'previous_step', v_progress.current_step_id,
    'new_step', v_new_step_id,
    'previous_phase', v_progress.current_phase_id,
    'new_phase', v_new_phase_id,
    'accuracy_pct', p_accuracy_pct
  );
END;
$$ LANGUAGE plpgsql;


-- 感想・日記テーブル
CREATE TABLE IF NOT EXISTS training_diaries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_session_id UUID NOT NULL REFERENCES daily_sessions(id) ON DELETE CASCADE,
  student_id      UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  content         TEXT NOT NULL,
  input_method    TEXT NOT NULL DEFAULT 'typing' CHECK (input_method IN ('typing', 'voice')),
  char_count      INT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_training_diaries_student ON training_diaries (student_id, created_at DESC);

ALTER TABLE training_diaries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "全操作可能" ON training_diaries FOR ALL TO authenticated USING (true) WITH CHECK (true);
