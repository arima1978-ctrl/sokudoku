-- まず参照をNULLにしてから削除
UPDATE daily_sessions SET pre_speed_id = NULL, post_speed_id = NULL;
DELETE FROM speed_measurements;
DELETE FROM daily_sessions;
DELETE FROM training_tests;
DELETE FROM training_sessions;
DELETE FROM menu_segments;
DELETE FROM training_menus;

ALTER TABLE training_menus DROP CONSTRAINT IF EXISTS training_menus_duration_min_check;
ALTER TABLE daily_sessions DROP CONSTRAINT IF EXISTS daily_sessions_duration_min_check;
ALTER TABLE daily_sessions ADD CONSTRAINT daily_sessions_duration_min_check CHECK (duration_min IN (10, 20, 30));

INSERT INTO training_menus (id, phase_id, duration_min, name, description) VALUES
  ('phase1_10min', 'shunkan', 10, '瞬間よみ 10分', 'フラッシュ練習中心。短時間で脳を活性化'),
  ('phase1_20min', 'shunkan', 20, '瞬間よみ 20分', 'トレーニング+読書+簡単なアウトプット'),
  ('phase1_30min', 'shunkan', 30, '瞬間よみ 30分', 'しっかりトレーニングから高速読みまで完結'),
  ('phase2_10min', 'block', 10, '高速よみ 10分', 'フラッシュ復習+ブロック読み。短時間集中'),
  ('phase2_20min', 'block', 20, '高速よみ 20分', 'トレーニング+高速読み+アウトプット'),
  ('phase2_30min', 'block', 30, '高速よみ 30分', 'フルコースの高速読みトレーニング'),
  ('phase3_10min', 'output', 10, 'アウトプット 10分', 'ブロック復習+アウトプット。短時間集中'),
  ('phase3_20min', 'output', 20, 'アウトプット 20分', 'トレーニング+アウトプット+読書'),
  ('phase3_30min', 'output', 30, 'アウトプット 30分', 'フルコースのアウトプットトレーニング');

ALTER TABLE training_menus ADD CONSTRAINT training_menus_duration_min_check CHECK (duration_min IN (10, 20, 30));

INSERT INTO menu_segments (menu_id, segment_order, segment_type, duration_sec, has_test, test_duration_sec, test_type, skippable, description) VALUES
  ('phase1_10min', 1, 'barabara',           120, true, 30, 'shunkan_recall', true,  'ばらばら読み 2分 + テスト'),
  ('phase1_10min', 2, 'shunkan_tate_1line', 150, true, 30, 'shunkan_recall', false, 'たて1行瞬間よみ 2.5分 + テスト'),
  ('phase1_10min', 3, 'shunkan_tate_2line', 120, true, 30, 'shunkan_recall', false, 'たて2行瞬間よみ 2分 + テスト'),
  ('phase1_20min', 1, 'barabara',           120, true, 30, 'shunkan_recall', true,  'ばらばら読み 2分 + テスト'),
  ('phase1_20min', 2, 'shunkan_tate_1line', 150, true, 30, 'shunkan_recall', false, 'たて1行瞬間よみ 2.5分 + テスト'),
  ('phase1_20min', 3, 'shunkan_tate_2line', 120, true, 30, 'shunkan_recall', false, 'たて2行瞬間よみ 2分 + テスト'),
  ('phase1_20min', 4, 'shunkan_yoko_1line', 120, true, 30, 'shunkan_recall', false, 'よこ1行瞬間よみ 2分 + テスト'),
  ('phase1_20min', 5, 'shunkan_yoko_2line', 120, true, 30, 'shunkan_recall', false, 'よこ2行瞬間よみ 2分 + テスト'),
  ('phase1_20min', 6, 'koe_e',             90,  true, 30, 'shunkan_recall', false, '声になる/絵になる 1.5分 + テスト'),
  ('phase1_30min', 1, 'barabara',           150, true, 30, 'shunkan_recall', true,  'ばらばら読み 2.5分 + テスト'),
  ('phase1_30min', 2, 'shunkan_tate_1line', 180, true, 30, 'shunkan_recall', false, 'たて1行瞬間よみ 3分 + テスト'),
  ('phase1_30min', 3, 'shunkan_tate_2line', 150, true, 30, 'shunkan_recall', false, 'たて2行瞬間よみ 2.5分 + テスト'),
  ('phase1_30min', 4, 'shunkan_yoko_1line', 150, true, 30, 'shunkan_recall', false, 'よこ1行瞬間よみ 2.5分 + テスト'),
  ('phase1_30min', 5, 'shunkan_yoko_2line', 150, true, 30, 'shunkan_recall', false, 'よこ2行瞬間よみ 2.5分 + テスト'),
  ('phase1_30min', 6, 'koe_e',             120, true, 30, 'shunkan_recall', false, '声になる/絵になる 2分 + テスト'),
  ('phase1_30min', 7, 'shunkan_tate_1line', 150, true, 30, 'shunkan_recall', false, 'たて1行(2周目) 2.5分 + テスト'),
  ('phase1_30min', 8, 'shunkan_yoko_1line', 150, true, 30, 'shunkan_recall', false, 'よこ1行(2周目) 2.5分 + テスト'),
  ('phase2_10min', 1, 'shunkan_tate_1line', 90,  true, 20, 'shunkan_recall',       true,  '復習: たて1行 1.5分 + テスト'),
  ('phase2_10min', 2, 'block_tate',         180, true, 60, 'content_comprehension', false, 'たてブロック 3分 + テスト'),
  ('phase2_10min', 3, 'block_yoko',         120, true, 40, 'content_comprehension', false, 'よこブロック 2分 + テスト'),
  ('phase2_20min', 1, 'barabara',           60,  true, 20, 'shunkan_recall',       true,  '復習: ばらばら 1分 + テスト'),
  ('phase2_20min', 2, 'shunkan_tate_1line', 90,  true, 30, 'shunkan_recall',       true,  '復習: たて1行 1.5分 + テスト'),
  ('phase2_20min', 3, 'shunkan_yoko_1line', 90,  true, 30, 'shunkan_recall',       true,  '復習: よこ1行 1.5分 + テスト'),
  ('phase2_20min', 4, 'block_tate',         180, true, 60, 'content_comprehension', false, 'たてブロック 3分 + テスト'),
  ('phase2_20min', 5, 'block_yoko',         180, true, 60, 'content_comprehension', false, 'よこブロック 3分 + テスト'),
  ('phase2_30min', 1, 'barabara',           90,  true, 20, 'shunkan_recall',       true,  '復習: ばらばら 1.5分 + テスト'),
  ('phase2_30min', 2, 'shunkan_tate_1line', 120, true, 30, 'shunkan_recall',       true,  '復習: たて1行 2分 + テスト'),
  ('phase2_30min', 3, 'shunkan_yoko_1line', 120, true, 30, 'shunkan_recall',       true,  '復習: よこ1行 2分 + テスト'),
  ('phase2_30min', 4, 'block_tate',         210, true, 60, 'content_comprehension', false, 'たてブロック 3.5分 + テスト'),
  ('phase2_30min', 5, 'block_yoko',         210, true, 60, 'content_comprehension', false, 'よこブロック 3.5分 + テスト'),
  ('phase2_30min', 6, 'output_tate',        150, true, 60, 'vocab_check',           false, 'たてアウトプット 2.5分 + テスト'),
  ('phase2_30min', 7, 'output_yoko',        150, true, 60, 'vocab_check',           false, 'よこアウトプット 2.5分 + テスト'),
  ('phase3_10min', 1, 'block_tate',   90,  true, 30, 'content_comprehension', true,  '復習: たてブロック 1.5分 + テスト'),
  ('phase3_10min', 2, 'output_tate', 180,  true, 60, 'vocab_check',           false, 'たてアウトプット 3分 + テスト'),
  ('phase3_10min', 3, 'output_yoko', 120,  true, 40, 'vocab_check',           false, 'よこアウトプット 2分 + テスト'),
  ('phase3_20min', 1, 'block_tate',   90,  true, 30, 'content_comprehension', true,  '復習: たてブロック 1.5分 + テスト'),
  ('phase3_20min', 2, 'block_yoko',   90,  true, 30, 'content_comprehension', true,  '復習: よこブロック 1.5分 + テスト'),
  ('phase3_20min', 3, 'output_tate', 180, true, 60, 'vocab_check',           false, 'たてアウトプット 3分 + テスト'),
  ('phase3_20min', 4, 'output_yoko', 180, true, 60, 'vocab_check',           false, 'よこアウトプット 3分 + テスト'),
  ('phase3_30min', 1, 'shunkan_tate_1line', 60,  true, 20, 'shunkan_recall',       true,  '復習: たて1行 1分 + テスト'),
  ('phase3_30min', 2, 'block_tate',         120, true, 30, 'content_comprehension', true,  '復習: たてブロック 2分 + テスト'),
  ('phase3_30min', 3, 'block_yoko',         120, true, 30, 'content_comprehension', true,  '復習: よこブロック 2分 + テスト'),
  ('phase3_30min', 4, 'output_tate',        210, true, 60, 'vocab_check',           false, 'たてアウトプット 3.5分 + テスト'),
  ('phase3_30min', 5, 'output_yoko',        210, true, 60, 'vocab_check',           false, 'よこアウトプット 3.5分 + テスト'),
  ('phase3_30min', 6, 'output_tate',        150, true, 60, 'vocab_check',           false, 'たてアウトプット(2周目) 2.5分 + テスト'),
  ('phase3_30min', 7, 'output_yoko',        150, true, 60, 'vocab_check',           false, 'よこアウトプット(2周目) 2.5分 + テスト');
