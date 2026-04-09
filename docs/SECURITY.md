# セキュリティ対応状況と今後の課題

## 対応済み

### パスワードハッシュ化 (bcrypt)
- `schools.password_hash` / `students.student_password_hash` カラム追加
- ログイン時は hash 検証、hash が無い旧データは平文照合＋自動ハッシュ化で移行
- 既存データの一括 rehash: `node scripts/rehash-passwords.mjs`
- **旧 `password` / `student_password` カラムは移行完了後に DROP すること**

### セッション cookie の HMAC 署名
- `src/lib/sessionCookie.ts` で HMAC-SHA256 署名／検証
- 生徒 cookie (`sokudoku_student`) と 管理者 cookie (`sokudoku_admin`) の両方に適用
- `SESSION_SECRET` 環境変数（32文字以上）必須

### タイミング攻撃対策
- `crypto.timingSafeEqual` による定時比較（運用管理者 env 比較、移行期の平文照合時）

### SameSite Strict
- 両 cookie を `sameSite: 'strict'` に変更（CSRF 耐性向上）

### エラーメッセージ統一
- ID not found / Password wrong を区別せず「IDまたはパスワードが正しくありません」に統一（アカウント列挙対策）

### cookie 改ざん対策
- `getLoggedInAdmin` / `getLoggedInStudent` で署名検証失敗時は null を返す
- role 欠落／不正値の cookie を拒否（権限昇格回避）

## 未対応（本番前対応推奨）

### 🔴 Service Role Key の全面撤廃 ＋ RLS 運用
**現状**: `src/lib/supabase.ts` はサーバーサイドで `SUPABASE_SERVICE_ROLE_KEY` を使っており、RLS をバイパスして全テーブル無制限アクセス。サーバーアクションのバグがそのままデータ漏洩に直結する。

**移行計画**:
1. anon client と service client を分離:
   - `src/lib/supabase.ts` → `supabaseAnon` (anon key, RLS 有効)
   - `src/lib/supabaseAdmin.ts` → `supabaseAdmin` (service role, 明示的にサーバー管理用途のみ)
2. 全テーブルに RLS ポリシー定義:
   - `students`: 自生徒の id でのみ SELECT 可
   - `student_progress` / `daily_sessions` / `training_sessions` / `training_tests` / `speed_measurements`: 該当 student_id のみ
   - `schools`: platform 管理者のみ SELECT、塾本人は自レコードのみ
   - `contents`: 全 authenticated で SELECT、INSERT/UPDATE/DELETE は owner_school_id 一致またはroleで判定
   - `user_reading_speed`: 自生徒のみ
3. 認証コンテキスト注入:
   - Next.js の cookie 由来 id を Supabase JWT クレームとして渡すか、
   - または Supabase Auth に完全移行（現在は自前 cookie 認証）
4. 段階移行:
   - Phase 1: read-only 系を anon client に切替（getShunkanContent, getReadingContent 等）
   - Phase 2: 書き込み系を少しずつ移行、権限チェック二重化
   - Phase 3: service_role はメンテナンススクリプト専用にする

**所要**: 半日〜1日の設計 + 1〜2日の実装・テスト

### 🟡 レート制限
- `/login`, `/admin/login` のブルートフォース対策なし
- Vercel のエッジミドルウェアまたは Upstash Ratelimit + Redis で IP ベース制限を入れる
- 実装例: 10回/分で一時ロック

### 🟡 入力長・件数上限
- `contents.body` の最大長、`recognition_*_words` の件数上限を DB CHECK 制約＋サーバー検証で強化

### 🟡 管理者操作の監査ログ
- `admin_audit_logs` テーブル追加、コンテンツ作成／削除、生徒追加などの操作履歴を記録
- 問題発生時の追跡用

### 🟡 CSP / Security Headers
- `next.config.ts` に `headers()` で以下を追加:
  - `Content-Security-Policy`
  - `Strict-Transport-Security`
  - `X-Frame-Options: DENY`
  - `Referrer-Policy: same-origin`
  - `Permissions-Policy`

### 🟡 依存関係の脆弱性
- `npm audit` で 14件（moderate 9 / high 5）報告中
- `npm audit fix` で修正可能なものは対応、break change がある場合は個別検討

### 🟢 その他
- 旧 `password` / `student_password` 平文カラムの DROP（移行完了後）
- `.env.local` のローカル PC 平文保存の最小化（credential store 利用検討）
