import { getLoggedInSchool } from '@/lib/adminAuth'
import { redirect } from 'next/navigation'

export default async function AdminPage() {
  const school = await getLoggedInSchool()
  if (!school) redirect('/admin/login')
  redirect('/admin/dashboard')
}
