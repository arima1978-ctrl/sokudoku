import { createClient } from '@supabase/supabase-js'

/**
 * 公開読み取り用 Supabase クライアント（anon キー）
 *
 * RLS が適用されるため、anon ポリシーで SELECT 許可された
 * マスタデータ (training_phases, contents の is_active=true 等) のみ取得可能。
 *
 * サーバーアクション・ルートハンドラ・クライアントコンポーネントいずれでも使用可。
 */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase public の環境変数が設定されていません')
}

export const supabasePublic = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})
