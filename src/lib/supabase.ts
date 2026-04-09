/**
 * 後方互換エイリアス: 既存コードが `@/lib/supabase` から `supabase` を
 * import している箇所を壊さないため、admin クライアントをエクスポート。
 *
 * 新規コードは用途に応じて下記を直接 import してください:
 *   - サーバー専用(service_role, RLS バイパス): '@/lib/supabaseAdmin'
 *   - 公開読み取り(anon, RLS 適用): '@/lib/supabasePublic'
 */
export { supabaseAdmin as supabase } from '@/lib/supabaseAdmin'
