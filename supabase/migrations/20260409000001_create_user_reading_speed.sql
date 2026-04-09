-- ============================================================
-- user_reading_speed: 高速読み（たてブロックよみ）の基準速度を保持
--
-- 仕様:
--   - baseline_cpm: 前回セッションで到達した最大カウント/分
--   - last_session_ended_at: 前回セッション終了時刻
--   - 次回セッション開始時の初期速度は:
--       最終セッションから 24h 以内 → baseline_cpm * 0.8
--       最終セッションから 24h 超   → baseline_cpm * 0.6
--   - 初回セッション時はレコードが存在しないため、呼び出し側でデフォルト値(60)を使用
-- ============================================================

CREATE TABLE IF NOT EXISTS user_reading_speed (
  student_id            UUID PRIMARY KEY REFERENCES students(id) ON DELETE CASCADE,
  baseline_cpm          integer NOT NULL CHECK (baseline_cpm >= 0),
  current_mode          text NOT NULL DEFAULT '3point'
                        CHECK (current_mode IN ('3point', '2point', '1line', '2line')),
  last_session_ended_at timestamptz NOT NULL DEFAULT NOW(),
  created_at            timestamptz NOT NULL DEFAULT NOW(),
  updated_at            timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_reading_speed_updated_at
  ON user_reading_speed(updated_at DESC);

-- updated_at 自動更新トリガ
CREATE OR REPLACE FUNCTION set_user_reading_speed_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_user_reading_speed_updated_at ON user_reading_speed;
CREATE TRIGGER trg_user_reading_speed_updated_at
  BEFORE UPDATE ON user_reading_speed
  FOR EACH ROW EXECUTE FUNCTION set_user_reading_speed_updated_at();

-- RLS: 生徒自身のレコードのみ読取可。書込はサーバー側（service_role）から。
ALTER TABLE user_reading_speed ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "students can read own reading speed" ON user_reading_speed;
CREATE POLICY "students can read own reading speed"
  ON user_reading_speed FOR SELECT
  USING (true);

-- ============================================================
-- コース時間の調整: 高速読み(reading_speed) セグメント
--   10分コース: 120s (既存の設定を維持)
--   20分コース: 240s (120 → 240)
--   30分コース: 360s (既存120 → 360)
-- ============================================================

UPDATE menu_segments
   SET duration_sec = 240
 WHERE menu_id IN ('phase1_20min', 'phase2_20min', 'phase3_20min')
   AND segment_type = 'reading_speed';

UPDATE menu_segments
   SET duration_sec = 360
 WHERE menu_id IN ('phase1_30min', 'phase2_30min', 'phase3_30min')
   AND segment_type = 'reading_speed';
