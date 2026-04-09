import { createClient } from '@supabase/supabase-js'

/**
 * サーバー専用 Supabase クライアント（service_role キー）
 *
 * ⚠️ RLS を完全にバイパスします。以下に該当する場合のみ使用してください:
 *   - 認証済みセッション情報(studentId/schoolId/role)を使って
 *     サーバーアクション内で明示的に権限チェックしてから呼ぶ
 *   - seed/migration/メンテナンス用スクリプト
 *   - 運用管理者(platform)として操作する場合
 *
 * クライアントコンポーネントから直接 import しないこと。
 */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Supabase admin の環境変数が設定されていません')
}

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})
