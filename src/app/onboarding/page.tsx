import { getLoggedInStudent } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getGradeLevels, getSubjects } from '@/app/actions/onboarding'
import OnboardingForm from './OnboardingForm'

export default async function OnboardingPage() {
  const student = await getLoggedInStudent()
  if (!student) redirect('/login')
  if (student.onboarding_completed) redirect('/training')

  const [grades, subjects] = await Promise.all([
    getGradeLevels(),
    getSubjects(),
  ])

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="mb-2 text-center text-xl font-bold text-zinc-900">
            はじめての設定
          </h2>
          <p className="mb-6 text-center text-sm text-zinc-500">
            あなたに合ったトレーニングを準備します
          </p>
          <OnboardingForm
            grades={grades}
            subjects={subjects}
            defaultName={student.student_name ?? ''}
          />
        </div>
      </div>
    </div>
  )
}
