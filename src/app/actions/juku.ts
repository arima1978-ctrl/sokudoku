'use server'

import { supabase } from '@/lib/supabase'
import type { Juku } from '@/types/database'

export async function getJukus(search?: string): Promise<Juku[]> {
  let query = supabase
    .from('jukus')
    .select('*')
    .order('created_at', { ascending: false })

  if (search) {
    query = query.or(
      `juku_name.ilike.%${search}%,juku_id.ilike.%${search}%,family_code.ilike.%${search}%`
    )
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`塾データの取得に失敗しました: ${error.message}`)
  }

  return (data ?? []) as Juku[]
}

export async function getJuku(id: string): Promise<Juku> {
  const { data, error } = await supabase
    .from('jukus')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    throw new Error(`塾データの取得に失敗しました: ${error.message}`)
  }

  return data as Juku
}

export async function createJuku(input: Record<string, unknown>): Promise<Juku> {
  const { data, error } = await supabase
    .from('jukus')
    .insert(input)
    .select()
    .single()

  if (error) {
    throw new Error(`塾の登録に失敗しました: ${error.message}`)
  }

  return data as Juku
}

export async function updateJuku(id: string, input: Record<string, unknown>): Promise<Juku> {
  const { data, error } = await supabase
    .from('jukus')
    .update(input)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw new Error(`塾の更新に失敗しました: ${error.message}`)
  }

  return data as Juku
}

export async function deleteJuku(id: string): Promise<void> {
  const { error } = await supabase
    .from('jukus')
    .delete()
    .eq('id', id)

  if (error) {
    throw new Error(`塾の削除に失敗しました: ${error.message}`)
  }
}
