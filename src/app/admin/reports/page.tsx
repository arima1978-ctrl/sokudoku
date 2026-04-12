import { getLoggedInSchool } from '@/lib/adminAuth'
import { redirect } from 'next/navigation'
import { getSchoolCoachOverview, getGradeLevels } from '@/app/actions/coachHistory'
import BulkReportSelector from './BulkReportSelector'

export default async function AdminReportsPage() {
  const school = await getLoggedInSchool()
  if (!school) redirect('/admin/login')

  const [students, gradeLevels] = await Promise.all([
    getSchoolCoachOverview(school.id),
    getGradeLevels(),
  ])

  return (
    <div>
      <h2 className="mb-6 text-xl font-bold text-zinc-900">レポート一括印刷</h2>
      <BulkReportSelector students={students} gradeLevels={gradeLevels} />
    </div>
  )
}
