import { getLoggedInSchool } from '@/lib/adminAuth'
import { redirect } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import EditStudentForm from './EditStudentForm'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditStudentPage({ params }: PageProps) {
  const { id } = await params
  const school = await getLoggedInSchool()
  if (!school) redirect('/admin/login')

  const { data: student } = await supabase
    .from('students')
    .select('id, student_name, student_login_id, student_password, grade_level_id, status')
    .eq('id', id)
    .eq('school_id', school.id)
    .single()

  if (!student) redirect('/admin/students')

  const { data: grades } = await supabase
    .from('grade_levels')
    .select('id, name')
    .order('display_order', { ascending: true })

  const s = student as Record<string, unknown>

  return (
    <div className="mx-auto max-w-md">
      <h2 className="mb-6 text-xl font-bold text-zinc-900">生徒情報の編集</h2>
      <EditStudentForm
        studentId={s.id as string}
        defaultName={s.student_name as string ?? ''}
        defaultPassword={s.student_password as string}
        defaultGradeId={s.grade_level_id as string ?? ''}
        defaultStatus={s.status as string}
        loginId={s.student_login_id as string}
        grades={(grades ?? []) as Array<{ id: string; name: string }>}
      />
    </div>
  )
}
