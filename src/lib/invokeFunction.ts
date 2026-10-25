import { supabase } from './supabase'

/**
 * Supabase Edge Function 호출. 실패하면 함수가 돌려준 실제 오류 문구를 담아 던진다
 * (그냥 두면 어떤 실패든 "non-2xx" 같은 뜻 모를 문구만 보인다)
 */
export async function invokeFunction<T>(name: string, body: Record<string, unknown>, label: string): Promise<T> {
  if (!supabase) throw new Error('Supabase 연결이 없어요')
  const { data, error } = await supabase.functions.invoke(name, { body })
  if (error) {
    const res = (error as { context?: Response }).context
    let detail = error.message
    try {
      const b = await res?.json()
      detail = b?.error ?? b?.msg ?? b?.message ?? detail
    } catch {
      // 본문이 JSON이 아니면 기본 문구를 쓴다
    }
    throw new Error(`${label} 실패${res?.status ? ` (${res.status})` : ''}: ${detail}`)
  }
  if (!data?.ok) throw new Error(`${label} 실패: ${data?.error ?? '알 수 없는 오류'}`)
  return data as T
}
