-- ============================================================
-- contents テーブルに単語認識テスト用カラムを追加
--   recognition_in_words:    本文中に登場する単語（正解＝○）
--   recognition_decoy_words: 本文に登場しないダミー単語（正解＝×）
--
-- テスト形式: in 5語 + decoy 5語 をランダム順で提示、各問○×判定
-- 合格ライン: 90% (9/10 以上)
-- ============================================================

ALTER TABLE contents
  ADD COLUMN IF NOT EXISTS recognition_in_words text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS recognition_decoy_words text[] DEFAULT '{}';
