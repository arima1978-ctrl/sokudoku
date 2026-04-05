-- パート6: 通知テーブル + 制約修正 + RLS + 関数
CREATE TABLE parent_notifications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id      UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL CHECK (notification_type IN ('weekly_report','monthly_report','milestone','streak')),
  channel         TEXT NOT NULL CHECK (channel IN ('email', 'line')),
  subject         TEXT NOT NULL,
  body            TEXT NOT NULL,
  metadata        JSONB DEFAULT '{}',
  is_sent         BOOLEAN NOT NULL DEFAULT false,
  sent_at         TIMESTAMPTZ,
  error_message   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_parent_notifications_student ON parent_notifications (student_id, created_at DESC);
CREATE INDEX idx_parent_notifications_unsent ON parent_notifications (is_sent) WHERE is_sent = false;

-- training_tests の test_type 制約修正
ALTER TABLE training_tests DROP CONSTRAINT IF EXISTS training_tests_test_type_check;
ALTER TABLE training_tests ADD CONSTRAINT training_tests_test_type_check
  CHECK (test_type IN ('shunkan_recall','content_comprehension','vocab_check','speed_quiz'));

-- RLS
ALTER TABLE daily_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE speed_measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE parent_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "全操作可能" ON daily_sessions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "全操作可能" ON speed_measurements FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "全操作可能" ON parent_notifications FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- updated_at トリガー
CREATE TRIGGER trg_daily_sessions_updated_at
  BEFORE UPDATE ON daily_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- student_progress 自動作成関数
CREATE OR REPLACE FUNCTION initialize_student_progress(p_student_id UUID) RETURNS VOID AS $$
BEGIN
  INSERT INTO student_progress (student_id, current_phase_id, current_step_id)
  VALUES (p_student_id, 'shunkan', 'shunkan_tate_1line_lv1')
  ON CONFLICT (student_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql;
