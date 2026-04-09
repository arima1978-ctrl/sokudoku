// Seed a test school + student: 999999 / TEST01 / TEST01
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

const SCHOOL_ID = '999999'
const LOGIN_ID = 'TEST01'
const PASSWORD = 'TEST01'

async function main() {
  // 1. Find or create school
  let { data: school } = await supabase.from('schools').select('id, school_id, status').eq('school_id', SCHOOL_ID).maybeSingle()
  if (!school) {
    const { data, error } = await supabase.from('schools').insert({
      school_id: SCHOOL_ID,
      school_name: 'テストスクール',
      family_code: 'TEST',
      password: 'TEST01',
      status: 'active',
    }).select('id, school_id, status').single()
    if (error) throw error
    school = data
    console.log('created school', school)
  } else {
    console.log('school exists', school)
    if (school.status !== 'active' && school.status !== 'trial') {
      await supabase.from('schools').update({ status: 'active' }).eq('id', school.id)
      console.log('activated school')
    }
  }

  // 2. Find or create student
  const { data: existing } = await supabase
    .from('students')
    .select('id, student_login_id, status')
    .eq('school_id', school.id)
    .eq('student_login_id', LOGIN_ID)
    .maybeSingle()

  if (existing) {
    console.log('student exists', existing)
    const { error } = await supabase
      .from('students')
      .update({ student_password: PASSWORD, status: 'active', onboarding_completed: true })
      .eq('id', existing.id)
    if (error) throw error
    console.log('reset password, activated, onboarding skipped')
  } else {
    const { data, error } = await supabase.from('students').insert({
      school_id: school.id,
      student_login_id: LOGIN_ID,
      student_password: PASSWORD,
      student_name: 'テスト生徒',
      status: 'active',
      onboarding_completed: true,
    }).select().single()
    if (error) throw error
    console.log('created student', data)
  }

  // 3. Ensure student_progress exists
  const studentId = existing ? existing.id : (await supabase.from('students').select('id').eq('school_id', school.id).eq('student_login_id', LOGIN_ID).single()).data.id
  const { data: prog } = await supabase.from('student_progress').select('student_id').eq('student_id', studentId).maybeSingle()
  if (!prog) {
    const { error } = await supabase.from('student_progress').insert({
      student_id: studentId,
      current_phase_id: 'shunkan',
      current_step_id: 'shunkan_tate_1line_lv1',
    })
    if (error) throw error
    console.log('created student_progress')
  } else {
    console.log('student_progress exists')
  }

  console.log('\n✓ Login with: school=999999 loginId=TEST01 password=TEST01')
}

main().catch(e => { console.error(e); process.exit(1) })
