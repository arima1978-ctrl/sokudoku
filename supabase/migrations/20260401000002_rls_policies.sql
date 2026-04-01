-- ============================================================
-- RLS ポリシー（管理者のみアクセス可能）
-- ============================================================

-- RLS 有効化
ALTER TABLE jukus ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_history ENABLE ROW LEVEL SECURITY;

-- 管理者（認証済みユーザー）のみ全操作可能
CREATE POLICY "管理者は塾データを全操作可能"
  ON jukus FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "管理者は生徒データを全操作可能"
  ON students FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "管理者はログイン履歴を全操作可能"
  ON login_history FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
