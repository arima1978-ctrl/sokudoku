import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Supabase の環境変数が設定されていません')
}

// サーバー側専用クライアント（Server Actions / Route Handlers でのみ使用）
export const supabase = createClient(supabaseUrl, supabaseServiceKey)
