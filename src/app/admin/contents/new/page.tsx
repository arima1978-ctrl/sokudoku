import { redirect } from 'next/navigation'
import { getLoggedInAdmin } from '@/lib/adminAuth'
import ContentForm from '../ContentForm'

export default async function NewContentPage() {
  const admin = await getLoggedInAdmin()
  if (!admin) redirect('/admin/login')

  return (
    <div className="mx-auto max-w-4xl">
      <h2 className="mb-6 text-2xl font-bold text-zinc-900">コンテンツ新規作成</h2>
      <ContentForm mode="new" canDelete={false} />
    </div>
  )
}
