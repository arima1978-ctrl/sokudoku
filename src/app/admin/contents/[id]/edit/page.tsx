import { redirect, notFound } from 'next/navigation'
import { getLoggedInAdmin } from '@/lib/adminAuth'
import { getContentById } from '@/app/actions/contents'
import ContentForm from '../../ContentForm'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditContentPage({ params }: PageProps) {
  const admin = await getLoggedInAdmin()
  if (!admin) redirect('/admin/login')

  const { id } = await params
  const content = await getContentById(id)
  if (!content) notFound()

  // 塾管理者は自塾登録のみ編集可
  const canEdit = admin.role === 'platform' || content.owner_school_id === admin.id
  if (!canEdit) {
    return (
      <div className="mx-auto max-w-3xl">
        <h2 className="mb-2 text-xl font-bold text-zinc-900">{content.title}</h2>
        <p className="mb-6 text-sm text-red-600">このコンテンツは閲覧のみ可能です</p>
        <pre className="whitespace-pre-wrap rounded-lg border border-zinc-200 bg-white p-4 text-sm text-zinc-700">
          {content.body}
        </pre>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl">
      <h2 className="mb-6 text-2xl font-bold text-zinc-900">コンテンツ編集</h2>
      <ContentForm
        mode="edit"
        initial={{
          id: content.id,
          title: content.title,
          body: content.body,
          grade_level_id: content.grade_level_id,
          subject_id: content.subject_id,
          difficulty: content.difficulty,
          is_active: content.is_active,
          recognition_in_words: content.recognition_in_words ?? [],
          recognition_decoy_words: content.recognition_decoy_words ?? [],
        }}
        canDelete
      />
    </div>
  )
}
