-- ============================================================
-- 速読ID/パスワード管理スキーマ
-- ============================================================
-- 1. jukus        : 塾マスター（塾情報 + 管理者ログイン）
-- 2. students     : 生徒（塾配下の生徒ID/PW）
-- 3. login_history: ログイン履歴（利用状況追跡）
-- ============================================================

-- ========== 1. 塾マスター ==========
CREATE TABLE jukus (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  juku_id         TEXT NOT NULL UNIQUE,              -- 速読システム上の塾ID
  family_code     TEXT NOT NULL UNIQUE,              -- 家族コード（= 塾ID と同値の場合あり）
  juku_name       TEXT NOT NULL,                     -- 塾名
  password        TEXT NOT NULL,                     -- 速読システムログインPW
  email           TEXT,                              -- 連絡先メール
  prefecture      TEXT,                              -- 都道府県
  address         TEXT,                              -- 住所
  tel             TEXT,                              -- 電話番号
  tantou          TEXT,                              -- 担当者名
  member_type     TEXT NOT NULL DEFAULT 'culture_kids',
                  -- 'culture_kids': カルチャーキッズ会員
                  -- 'eduplus': エデュプラス会員
                  -- 'none': 非会員
  status          TEXT NOT NULL DEFAULT 'active',
                  -- 'active': 本入会, 'trial': 体験中, 'cancelled': 解約済
  form_type       TEXT,                              -- 'contract': 契約, 'trial': 体験
  course_name     TEXT DEFAULT '一般100万人の大人の速読',
  start_date      DATE,                              -- 利用開始日
  end_date        DATE,                              -- 利用終了日
  notes           TEXT,                              -- 備考
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_jukus_juku_id     ON jukus (juku_id);
CREATE INDEX idx_jukus_juku_name   ON jukus (juku_name);
CREATE INDEX idx_jukus_status      ON jukus (status);
CREATE INDEX idx_jukus_member_type ON jukus (member_type);

COMMENT ON TABLE  jukus IS '速読管理 塾マスター';
COMMENT ON COLUMN jukus.juku_id IS '速読システム上の塾ID（new.100mil-sokudoku.com）';
COMMENT ON COLUMN jukus.member_type IS 'culture_kids=カルチャーキッズ, eduplus=エデュプラス, none=非会員';
COMMENT ON COLUMN jukus.status IS 'active=本入会, trial=体験中, cancelled=解約済';


-- ========== 2. 生徒（塾配下） ==========
CREATE TABLE students (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  juku_id         UUID NOT NULL REFERENCES jukus(id) ON DELETE CASCADE,
  student_login_id TEXT NOT NULL,                    -- 生徒ログインID
  student_password TEXT NOT NULL,                    -- 生徒パスワード
  student_name    TEXT,                              -- 生徒名
  grade           TEXT,                              -- 学年
  status          TEXT NOT NULL DEFAULT 'active',
                  -- 'active': 利用中, 'inactive': 停止中
  start_date      DATE,                              -- 利用開始日
  end_date        DATE,                              -- 利用終了日
  notes           TEXT,                              -- 備考
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (juku_id, student_login_id)
);

CREATE INDEX idx_students_juku   ON students (juku_id);
CREATE INDEX idx_students_status ON students (status);

COMMENT ON TABLE  students IS '速読 生徒ID/PW管理';
COMMENT ON COLUMN students.student_login_id IS '速読システム上の生徒ログインID';


-- ========== 3. ログイン履歴（オプション） ==========
CREATE TABLE login_history (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  juku_id     UUID REFERENCES jukus(id) ON DELETE SET NULL,
  student_id  UUID REFERENCES students(id) ON DELETE SET NULL,
  login_type  TEXT NOT NULL DEFAULT 'juku',
              -- 'juku': 塾管理者ログイン, 'student': 生徒ログイン
  logged_in_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_address  TEXT,
  user_agent  TEXT
);

CREATE INDEX idx_login_history_juku    ON login_history (juku_id);
CREATE INDEX idx_login_history_student ON login_history (student_id);
CREATE INDEX idx_login_history_date    ON login_history (logged_in_at);


-- ========== updated_at 自動更新トリガー ==========
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_jukus_updated_at
  BEFORE UPDATE ON jukus FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_students_updated_at
  BEFORE UPDATE ON students FOR EACH ROW EXECUTE FUNCTION update_updated_at();
