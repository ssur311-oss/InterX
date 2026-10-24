import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'

/** 테이블 전체를 정렬해서 읽고, 저장 뒤 reload()로 다시 읽는다 */
export function useRows<T>(table: string, orderBy: string) {
  const [rows, setRows] = useState<T[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    if (!supabase) return
    let query = supabase.from(table).select('*')
    for (const column of orderBy.split(',')) query = query.order(column.trim())
    const { data, error } = await query
    setError(error?.message ?? null)
    setRows((data ?? []) as T[])
    setLoading(false)
  }, [table, orderBy])

  useEffect(() => {
    reload()
  }, [reload])

  return { rows, error, loading, reload }
}
