import { supabase } from './supabase'
import type { StoredStatus } from './rules/docStatus'
import type { DashDoc, DashExpense } from './useDashboard'

/** 체크를 풀면 예정일이 있던 증빙은 '제출 예정'으로, 없던 증빙은 '미제출'로 돌아간다 */
export function uncheckedStatus(doc: Pick<DashDoc, 'planned_date'>): StoredStatus {
  return doc.planned_date ? 'scheduled' : 'missing'
}

/** 증빙이 모두 제출되면 완료함으로 간다. (위험 확인은 AI 기능을 붙일 때 다시 조건에 넣는다) */
export function isComplete(e: Pick<DashExpense, 'required_docs'>): boolean {
  return e.required_docs.every((d) => d.status === 'submitted')
}

/**
 * 관리자가 체크박스를 눌렀을 때만 실행된다 (RULE.md 0-2).
 * 이력을 먼저 남기고 상태를 바꾼다. 체크를 풀어도 이전 기록은 지우지 않고 새 이력을 더한다 (RULE.md 0-4).
 */
export async function setDocSubmitted(expenseId: string, doc: Pick<DashDoc, 'id' | 'doc_type' | 'planned_date'>, checked: boolean) {
  if (!supabase) throw new Error('Supabase 연결이 없어요')
  const log = await supabase.from('activity_log').insert({
    expense_id: expenseId,
    doc_id: doc.id,
    kind: checked ? 'submitted' : 'memo',
    content: checked ? `[제출 확인] ${doc.doc_type}` : `[제출 확인 취소] ${doc.doc_type}`,
    source: 'manual',
  })
  if (log.error) throw log.error
  const status = checked ? 'submitted' : uncheckedStatus(doc)
  const res = await supabase.from('required_docs').update({ status }).eq('id', doc.id)
  if (res.error) throw res.error
  return status
}
