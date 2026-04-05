/**
 * Supabase マイグレーション実行スクリプト
 * Service Role Key を使って supabase-js 経由ではなく、
 * PostgreSQL 直接接続でマイグレーションを実行する
 *
 * Usage: node scripts/run-migration.mjs <sql-file>
 *
 * 環境変数 DATABASE_URL が設定されている場合はそれを使用。
 * なければ Supabase プロジェクトURLから推測。
 */
import { readFileSync } from 'fs'
import pg from 'pg'

const { Client } = pg

// .env.local から読み込み
const envContent = readFileSync('.env.local', 'utf-8')
const envVars = {}
for (const line of envContent.split('\n')) {
  const [key, ...rest] = line.split('=')
  if (key && rest.length) envVars[key.trim()] = rest.join('=').trim()
}

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL
const projectRef = supabaseUrl?.match(/https:\/\/(.+)\.supabase\.co/)?.[1]

if (!projectRef) {
  console.error('Could not extract project ref from SUPABASE_URL')
  process.exit(1)
}

// データベースURLを構築
// Supabase direct connection: postgresql://postgres.[ref]:[password]@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres
const dbPassword = process.env.DB_PASSWORD || envVars.DB_PASSWORD

if (!dbPassword) {
  console.error('')
  console.error('DB_PASSWORD が設定されていません。')
  console.error('')
  console.error('Supabase Dashboard → Project Settings → Database → Connection string')
  console.error('から Database Password を取得して、以下のように実行してください:')
  console.error('')
  console.error('  DB_PASSWORD=your_password node scripts/run-migration.mjs supabase/migrations/20260404000001_new_training_flow.sql')
  console.error('')
  console.error('または .env.local に DB_PASSWORD=xxx を追加してください。')
  process.exit(1)
}

const connectionString = `postgresql://postgres.${projectRef}:${dbPassword}@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres`

const sqlFile = process.argv[2]
if (!sqlFile) {
  console.error('Usage: node scripts/run-migration.mjs <sql-file>')
  process.exit(1)
}

console.log(`Connecting to Supabase project: ${projectRef}`)
console.log(`Running migration: ${sqlFile}`)

const sql = readFileSync(sqlFile, 'utf-8')

const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } })

try {
  await client.connect()
  console.log('Connected.')

  await client.query(sql)
  console.log('Migration completed successfully!')
} catch (err) {
  console.error('Migration failed:', err.message)
  if (err.detail) console.error('Detail:', err.detail)
  if (err.hint) console.error('Hint:', err.hint)
  process.exit(1)
} finally {
  await client.end()
}
