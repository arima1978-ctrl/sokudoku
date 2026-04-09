import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

const env = Object.fromEntries(
  fs.readFileSync(path.resolve('.env.local'), 'utf8')
    .split(/\r?\n/).filter(l => l && !l.startsWith('#')).map(l => {
      const i = l.indexOf('=')
      return [l.slice(0, i), l.slice(i + 1)]
    })
)

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

const { data, error } = await supabase.rpc('pg_tables_list').select()
if (error) {
  // Fallback: query information_schema directly is not possible via REST. Try a known table.
  console.log('RPC not available, listing via known query')
  const { data: d2, error: e2 } = await supabase
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'public')
  if (e2) { console.error(e2); process.exit(1) }
  console.log(d2)
} else {
  console.log(data)
}
