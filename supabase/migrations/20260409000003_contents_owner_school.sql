-- ============================================================
-- contents テーブルに owner_school_id 列を追加
--   NULL       → 運用管理者登録（全塾で共通利用）
--   UUID       → その塾が登録（自塾のみ編集可、他塾でも閲覧は可能）
-- ============================================================

ALTER TABLE contents
  ADD COLUMN IF NOT EXISTS owner_school_id UUID NULL REFERENCES schools(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_contents_owner_school ON contents(owner_school_id);
