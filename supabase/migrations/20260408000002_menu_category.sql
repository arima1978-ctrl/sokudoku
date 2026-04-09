-- ============================================================
-- training_menus にコース種別(category)追加
--   'basic' = 速読基本トレーニング
--   'genre' = ジャンル別コース(教科別)
-- ============================================================

ALTER TABLE training_menus
  ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'basic';

ALTER TABLE training_menus
  DROP CONSTRAINT IF EXISTS training_menus_category_check;
ALTER TABLE training_menus
  ADD CONSTRAINT training_menus_category_check CHECK (category IN ('basic', 'genre'));

-- 既存メニューはすべて basic に設定
UPDATE training_menus SET category = 'basic';
