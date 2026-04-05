-- パート5: menu_segments Phase2 + Phase3
-- Phase 2: 高速よみ
INSERT INTO menu_segments (menu_id, segment_order, segment_type, duration_sec, has_test, test_duration_sec, test_type, skippable, description) VALUES
  ('phase2_7min', 1, 'shunkan_tate_1line', 60,  true, 20, 'shunkan_recall',       true,  '復習: たて1行 1分 + テスト'),
  ('phase2_7min', 2, 'block_tate',         150, true, 60, 'content_comprehension', false, 'たてブロック 2.5分 + テスト'),
  ('phase2_7min', 3, 'block_yoko',         90,  true, 40, 'content_comprehension', false, 'よこブロック 1.5分 + テスト');

INSERT INTO menu_segments (menu_id, segment_order, segment_type, duration_sec, has_test, test_duration_sec, test_type, skippable, description) VALUES
  ('phase2_15min', 1, 'barabara',           60,  true, 20, 'shunkan_recall',       true,  '復習: ばらばら 1分 + テスト'),
  ('phase2_15min', 2, 'shunkan_tate_1line', 90,  true, 30, 'shunkan_recall',       true,  '復習: たて1行 1.5分 + テスト'),
  ('phase2_15min', 3, 'shunkan_yoko_1line', 90,  true, 30, 'shunkan_recall',       true,  '復習: よこ1行 1.5分 + テスト'),
  ('phase2_15min', 4, 'block_tate',         150, true, 60, 'content_comprehension', false, 'たてブロック 2.5分 + テスト'),
  ('phase2_15min', 5, 'block_yoko',         150, true, 60, 'content_comprehension', false, 'よこブロック 2.5分 + テスト');

INSERT INTO menu_segments (menu_id, segment_order, segment_type, duration_sec, has_test, test_duration_sec, test_type, skippable, description) VALUES
  ('phase2_30min', 1, 'barabara',           90,  true, 20, 'shunkan_recall',       true,  '復習: ばらばら 1.5分 + テスト'),
  ('phase2_30min', 2, 'shunkan_tate_1line', 120, true, 30, 'shunkan_recall',       true,  '復習: たて1行 2分 + テスト'),
  ('phase2_30min', 3, 'shunkan_yoko_1line', 120, true, 30, 'shunkan_recall',       true,  '復習: よこ1行 2分 + テスト'),
  ('phase2_30min', 4, 'block_tate',         180, true, 60, 'content_comprehension', false, 'たてブロック 3分 + テスト'),
  ('phase2_30min', 5, 'block_yoko',         180, true, 60, 'content_comprehension', false, 'よこブロック 3分 + テスト'),
  ('phase2_30min', 6, 'output_tate',        150, true, 60, 'vocab_check',           false, 'たてアウトプット 2.5分 + テスト'),
  ('phase2_30min', 7, 'output_yoko',        150, true, 60, 'vocab_check',           false, 'よこアウトプット 2.5分 + テスト');

-- Phase 3: アウトプット
INSERT INTO menu_segments (menu_id, segment_order, segment_type, duration_sec, has_test, test_duration_sec, test_type, skippable, description) VALUES
  ('phase3_7min', 1, 'block_tate',   60,  true, 30, 'content_comprehension', true,  '復習: たてブロック 1分 + テスト'),
  ('phase3_7min', 2, 'output_tate', 150,  true, 60, 'vocab_check',           false, 'たてアウトプット 2.5分 + テスト'),
  ('phase3_7min', 3, 'output_yoko',  90,  true, 40, 'vocab_check',           false, 'よこアウトプット 1.5分 + テスト');

INSERT INTO menu_segments (menu_id, segment_order, segment_type, duration_sec, has_test, test_duration_sec, test_type, skippable, description) VALUES
  ('phase3_15min', 1, 'block_tate',   90,  true, 30, 'content_comprehension', true,  '復習: たてブロック 1.5分 + テスト'),
  ('phase3_15min', 2, 'block_yoko',   90,  true, 30, 'content_comprehension', true,  '復習: よこブロック 1.5分 + テスト'),
  ('phase3_15min', 3, 'output_tate', 150, true, 60, 'vocab_check',           false, 'たてアウトプット 2.5分 + テスト'),
  ('phase3_15min', 4, 'output_yoko', 150, true, 60, 'vocab_check',           false, 'よこアウトプット 2.5分 + テスト');

INSERT INTO menu_segments (menu_id, segment_order, segment_type, duration_sec, has_test, test_duration_sec, test_type, skippable, description) VALUES
  ('phase3_30min', 1, 'shunkan_tate_1line', 60,  true, 20, 'shunkan_recall',       true,  '復習: たて1行 1分 + テスト'),
  ('phase3_30min', 2, 'block_tate',         120, true, 30, 'content_comprehension', true,  '復習: たてブロック 2分 + テスト'),
  ('phase3_30min', 3, 'block_yoko',         120, true, 30, 'content_comprehension', true,  '復習: よこブロック 2分 + テスト'),
  ('phase3_30min', 4, 'output_tate',        180, true, 60, 'vocab_check',           false, 'たてアウトプット 3分 + テスト'),
  ('phase3_30min', 5, 'output_yoko',        180, true, 60, 'vocab_check',           false, 'よこアウトプット 3分 + テスト'),
  ('phase3_30min', 6, 'output_tate',        150, true, 60, 'vocab_check',           false, 'たてアウトプット(2周目) 2.5分 + テスト'),
  ('phase3_30min', 7, 'output_yoko',        150, true, 60, 'vocab_check',           false, 'よこアウトプット(2周目) 2.5分 + テスト');
