// 既存の平文パスワードを bcrypt ハッシュに移行する一回限りのスクリプト
// 使い方: node scripts/rehash-passwords.mjs
import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'
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

const ROUNDS = 10

async function rehashSchools() {
  const { data, error } = await supabase
    .from('schools')
    .select('id, password, password_hash')
  if (error) { console.error('schools read error:', error); return }
  let updated = 0
  for (const row of data ?? []) {
    if (row.password_hash) continue // 既にハッシュ済み
    if (!row.password) continue
    const hash = await bcrypt.hash(row.password, ROUNDS)
    const { error: e } = await supabase
      .from('schools')
      .update({ password_hash: hash })
      .eq('id', row.id)
    if (e) { console.error('school update error:', row.id, e); continue }
    updated++
  }
  console.log(`schools: ${updated} rehashed`)
}

async function rehashStudents() {
  const { data, error } = await supabase
    .from('students')
    .select('id, student_password, student_password_hash')
  if (error) { console.error('students read error:', error); return }
  let updated = 0
  for (const row of data ?? []) {
    if (row.student_password_hash) continue
    if (!row.student_password) continue
    const hash = await bcrypt.hash(row.student_password, ROUNDS)
    const { error: e } = await supabase
      .from('students')
      .update({ student_password_hash: hash })
      .eq('id', row.id)
    if (e) { console.error('student update error:', row.id, e); continue }
    updated++
  }
  console.log(`students: ${updated} rehashed`)
}

await rehashSchools()
await rehashStudents()
console.log('done')
