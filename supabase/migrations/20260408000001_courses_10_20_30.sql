-- ============================================================
-- コース時間を 7/15/30分 → 10/20/30分 に変更
-- ============================================================
-- 変更点:
-- 1. training_menus の CHECK 制約を 10/20/30 に変更
-- 2. daily_sessions の CHECK 制約を 10/20/30 に変更
-- 3. 7分/15分メニューのセグメント削除 → メニュー削除
-- 4. 10分/20分メニューを新規挿入(30分は既存のまま維持)
-- 5. menu_segments を新メニューに対応して再構成
-- ============================================================

-- 1. CHECK 制約を一旦 DROP(挿入のため緩める)
ALTER TABLE training_menus  DROP CONSTRAINT IF EXISTS training_menus_duration_min_check;
ALTER TABLE daily_sessions  DROP CONSTRAINT IF EXISTS daily_sessions_duration_min_check;

-- 2. 既存の 7分 / 15分 を削除(segments は CASCADE)
DELETE FROM training_menus WHERE duration_min IN (7, 15);

-- 3. 新しい 10分 / 20分 メニューを挿入
INSERT INTO training_menus (id, phase_id, duration_min, name, description) VALUES
  ('phase1_10min', 'shunkan', 10, '瞬間よみ 10分', 'ばらばら + たて/よこ瞬間よみ + テスト'),
  ('phase1_20min', 'shunkan', 20, '瞬間よみ 20分', '全瞬間よみ種目 + テスト'),

  ('phase2_10min', 'block',   10, '高速よみ 10分', '瞬間復習 + ブロックよみ + テスト'),
  ('phase2_20min', 'block',   20, '高速よみ 20分', '瞬間復習 + ブロックよみ + アウトプット + テスト'),

  ('phase3_10min', 'output',  10, 'アウトプット 10分', 'ブロック復習 + アウトプット + テスト'),
  ('phase3_20min', 'output',  20, 'アウトプット 20分', 'ブロック復習 + アウトプット(繰り返し) + テスト');

-- 4. CHECK 制約を新しい値で再作成
ALTER TABLE training_menus
  ADD CONSTRAINT training_menus_duration_min_check CHECK (duration_min IN (10, 20, 30));
ALTER TABLE daily_sessions
  ADD CONSTRAINT daily_sessions_duration_min_check CHECK (duration_min IN (10, 20, 30));

-- ============================================================
-- 5. menu_segments 再構成(10分 / 20分)
-- 合計 = duration_sec + test_duration_sec の総和が duration_min*60 相当
-- フロー: 眼筋/フラッシュ → 高速読み → テスト(セグメント毎に付与)
-- ============================================================

-- Phase 1: 瞬間よみ 10分 (合計 600s)
-- ※最後に reading_speed(高速読み 120s, 最低2分)を必須配置
INSERT INTO menu_segments (menu_id, segment_order, segment_type, duration_sec, has_test, test_duration_sec, test_type, skippable, description) VALUES
  ('phase1_10min', 1, 'barabara',           90,  true, 30, 'shunkan_recall', true,  'ばらばら読み 1.5分 + テスト'),
  ('phase1_10min', 2, 'shunkan_tate_1line', 120, true, 30, 'shunkan_recall', false, 'たて1行瞬間よみ 2分 + テスト'),
  ('phase1_10min', 3, 'shunkan_tate_2line', 90,  true, 30, 'shunkan_recall', false, 'たて2行瞬間よみ 1.5分 + テスト'),
  ('phase1_10min', 4, 'reading_speed',      120, false, 0, NULL,             false, '高速読みトレーニング 最低2分');

-- Phase 1: 瞬間よみ 20分 (合計 1200s)
-- ※最後に reading_speed(高速読み 120s, 最低2分)を必須配置
INSERT INTO menu_segments (menu_id, segment_order, segment_type, duration_sec, has_test, test_duration_sec, test_type, skippable, description) VALUES
  ('phase1_20min', 1, 'barabara',           150, true, 30, 'shunkan_recall', true,  'ばらばら読み 2.5分 + テスト'),
  ('phase1_20min', 2, 'shunkan_tate_1line', 150, true, 30, 'shunkan_recall', false, 'たて1行瞬間よみ 2.5分 + テスト'),
  ('phase1_20min', 3, 'shunkan_tate_2line', 120, true, 30, 'shunkan_recall', false, 'たて2行瞬間よみ 2分 + テスト'),
  ('phase1_20min', 4, 'shunkan_yoko_1line', 120, true, 30, 'shunkan_recall', false, 'よこ1行瞬間よみ 2分 + テスト'),
  ('phase1_20min', 5, 'shunkan_yoko_2line', 120, true, 30, 'shunkan_recall', false, 'よこ2行瞬間よみ 2分 + テスト'),
  ('phase1_20min', 6, 'koe_e',              120, true, 30, 'shunkan_recall', false, '声になる/絵になる 2分 + テスト'),
  ('phase1_20min', 7, 'reading_speed',      120, false, 0, NULL,             false, '高速読みトレーニング 最低2分');

-- Phase 2: 高速よみ 10分 (合計 600s)
-- ※最後に reading_speed(高速読み 120s, 最低2分)を必須配置
INSERT INTO menu_segments (menu_id, segment_order, segment_type, duration_sec, has_test, test_duration_sec, test_type, skippable, description) VALUES
  ('phase2_10min', 1, 'shunkan_tate_1line', 60,  true, 30, 'shunkan_recall',        true,  '復習: たて1行 1分 + テスト'),
  ('phase2_10min', 2, 'block_tate',         150, true, 60, 'content_comprehension', false, 'たてブロック 2.5分 + テスト'),
  ('phase2_10min', 3, 'block_yoko',         120, true, 60, 'content_comprehension', false, 'よこブロック 2分 + テスト'),
  ('phase2_10min', 4, 'reading_speed',      120, false, 0, NULL,                    false, '高速読みトレーニング 最低2分');

-- Phase 2: 高速よみ 20分 (合計 1200s)
-- ※最後に reading_speed(高速読み 120s, 最低2分)を必須配置
INSERT INTO menu_segments (menu_id, segment_order, segment_type, duration_sec, has_test, test_duration_sec, test_type, skippable, description) VALUES
  ('phase2_20min', 1, 'barabara',           90,  true, 30, 'shunkan_recall',        true,  '復習: ばらばら 1.5分 + テスト'),
  ('phase2_20min', 2, 'shunkan_tate_1line', 90,  true, 30, 'shunkan_recall',        true,  '復習: たて1行 1.5分 + テスト'),
  ('phase2_20min', 3, 'shunkan_yoko_1line', 60,  true, 30, 'shunkan_recall',        true,  '復習: よこ1行 1分 + テスト'),
  ('phase2_20min', 4, 'block_tate',         180, true, 60, 'content_comprehension', false, 'たてブロック 3分 + テスト'),
  ('phase2_20min', 5, 'block_yoko',         180, true, 60, 'content_comprehension', false, 'よこブロック 3分 + テスト'),
  ('phase2_20min', 6, 'output_tate',        180, true, 60, 'vocab_check',           false, 'たてアウトプット 3分 + テスト'),
  ('phase2_20min', 7, 'reading_speed',      120, false, 0, NULL,                    false, '高速読みトレーニング 最低2分');

-- Phase 3: アウトプット 10分 (合計 600s)
-- ※最後に reading_speed(高速読み 120s, 最低2分)を必須配置
INSERT INTO menu_segments (menu_id, segment_order, segment_type, duration_sec, has_test, test_duration_sec, test_type, skippable, description) VALUES
  ('phase3_10min', 1, 'block_tate',    60,  true, 30, 'content_comprehension', true,  '復習: たてブロック 1分 + テスト'),
  ('phase3_10min', 2, 'output_tate',   150, true, 60, 'vocab_check',           false, 'たてアウトプット 2.5分 + テスト'),
  ('phase3_10min', 3, 'output_yoko',   120, true, 60, 'vocab_check',           false, 'よこアウトプット 2分 + テスト'),
  ('phase3_10min', 4, 'reading_speed', 120, false, 0, NULL,                    false, '高速読みトレーニング 最低2分');

-- Phase 3: アウトプット 20分 (合計 1200s)
-- ※最後に reading_speed(高速読み 120s, 最低2分)を必須配置
INSERT INTO menu_segments (menu_id, segment_order, segment_type, duration_sec, has_test, test_duration_sec, test_type, skippable, description) VALUES
  ('phase3_20min', 1, 'block_tate',    90,  true, 30, 'content_comprehension', true,  '復習: たてブロック 1.5分 + テスト'),
  ('phase3_20min', 2, 'block_yoko',    90,  true, 30, 'content_comprehension', true,  '復習: よこブロック 1.5分 + テスト'),
  ('phase3_20min', 3, 'output_tate',   240, true, 60, 'vocab_check',           false, 'たてアウトプット 4分 + テスト'),
  ('phase3_20min', 4, 'output_yoko',   210, true, 60, 'vocab_check',           false, 'よこアウトプット 3.5分 + テスト'),
  ('phase3_20min', 5, 'output_tate',   180, true, 60, 'vocab_check',           false, 'たてアウトプット(2周目) 3分 + テスト'),
  ('phase3_20min', 6, 'reading_speed', 120, false, 0, NULL,                    false, '高速読みトレーニング 最低2分');

-- ============================================================
-- 6. 既存30分メニュー(phase1/2/3_30min)の末尾に高速読みを追加
--    (既存segment_orderより大きい番号で append)
-- ============================================================
INSERT INTO menu_segments (menu_id, segment_order, segment_type, duration_sec, has_test, test_duration_sec, test_type, skippable, description)
SELECT menu_id, COALESCE(MAX(segment_order), 0) + 1, 'reading_speed', 120, false, 0, NULL, false, '高速読みトレーニング 最低2分'
  FROM menu_segments
 WHERE menu_id IN ('phase1_30min','phase2_30min','phase3_30min')
 GROUP BY menu_id;
