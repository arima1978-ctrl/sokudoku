import { getLoggedInStudent } from '@/lib/auth'
import { redirect } from 'next/navigation'
import TrainingHeader from './TrainingHeader'

export default async function TrainingLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const student = await getLoggedInStudent()

  if (!student) {
    redirect('/login')
  }

  return (
    <div className="min-h-[calc(100vh-3.5rem)]">
      <TrainingHeader
        studentName={student.student_name}
        studentLoginId={student.student_login_id}
      />
      <div className="mx-auto max-w-4xl px-4 py-6">{children}</div>
    </div>
  )
}
