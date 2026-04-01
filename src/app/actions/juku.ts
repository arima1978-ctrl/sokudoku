'use server'

import { supabase } from '@/lib/supabase'
import type { School } from '@/types/database'

export async function getSchools(search?: string): Promise<School[]> {
  let query = supabase
    .from('schools')
    .select('*')
    .order('created_at', { ascending: false })

  if (search) {
    query = query.or(
      `school_name.ilike.%${search}%,school_id.ilike.%${search}%,family_code.ilike.%${search}%`
    )
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`スクールデータの取得に失敗しました: ${error.message}`)
  }

  return (data ?? []) as School[]
}

export async function getSchool(id: string): Promise<School> {
  const { data, error } = await supabase
    .from('schools')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    throw new Error(`スクールデータの取得に失敗しました: ${error.message}`)
  }

  return data as School
}

export async function createSchool(input: Record<string, unknown>): Promise<School> {
  const { data, error } = await supabase
    .from('schools')
    .insert(input)
    .select()
    .single()

  if (error) {
    throw new Error(`スクールの登録に失敗しました: ${error.message}`)
  }

  return data as School
}

export async function updateSchool(id: string, input: Record<string, unknown>): Promise<School> {
  const { data, error } = await supabase
    .from('schools')
    .update(input)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw new Error(`スクールの更新に失敗しました: ${error.message}`)
  }

  return data as School
}

export async function deleteSchool(id: string): Promise<void> {
  const { error } = await supabase
    .from('schools')
    .delete()
    .eq('id', id)

  if (error) {
    throw new Error(`スクールの削除に失敗しました: ${error.message}`)
  }
}
