import { weekdayOf } from './date'
import { formatDate } from './format'
import { invokeFunction } from './invokeFunction'
import { supabase } from './supabase'
import type { DashDoc, DashExpense } from './useDashboard'

// 슬랙 메시지 붙여넣기 (F6, RULE.md 5장 / SKILL.md 작업 1)
// AI는 분류·추출만. 어느 집행 건인지는 관리자가 고르고, [반영]을 눌러야 저장된다.
export type SlackType = 'delay' | 'submitted' | 'question' | 'budget' | 'other'

export type SlackResult = {
  type: SlackType
  doc_types: string[]
  planned_date: string | null
  reason: string | null
  candidate_expense_hint: string | null
  confidence: 'high' | 'medium' | 'low'
  needs_admin_check: boolean
  summary: string
}

export const SLACK_TYPE_LABEL: Record<SlackType, string> = {
  delay: '늦어짐 · 제출 약속',
  submitted: '제출했다고 함',
  question: '서류·절차 문의',
  budget: '예산 문의',
  other: '기타',
}

export const CONFIDENCE_LABEL = { high: '확실해요', medium: '조금 애매해요', low: '많이 애매해요' } as const

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

export const openDocs = (e: DashExpense) => e.required_docs.filter((d) => d.status !== 'submitted')
export const expenseLabel = (e: DashExpense) => `${formatDate(e.paid_at)} ${e.description ?? ''}`.trim()

/** AI에는 메시지·이름·증빙 종류·날짜만 보낸다 (금액·거래처 제외, RULE.md 9장) */
export async function readSlack(message: string, senderName: string, senderExpenses: DashExpense[], today: string) {
  return invokeFunction<SlackResult & { ok: true }>('ai-assist', {
    task: 'slack',
    message,
    sender: senderName,
    today: `${today}(${WEEKDAYS[weekdayOf(today)]})`,
    items: senderExpenses.map((e) => ({ expense: expenseLabel(e), docs: openDocs(e).map((d) => d.doc_type) })),
  }, 'AI 정리')
}

/** AI 힌트와 이름이 비슷한 집행 건인지 (표시용일 뿐, 자동 선택하지 않는다) */
export function matchesHint(e: DashExpense, hint: string | null) {
  if (!hint) return false
  const a = (e.description ?? '').replace(/\s/g, '')
  const b = hint.replace(/\s/g, '')
  return Boolean(a) && (b.includes(a) || a.includes(b))
}

type Apply = {
  type: SlackType
  expenseId: string | null
  docs: Pick<DashDoc, 'id' | 'doc_type'>[]
  plannedDate: string | null
  senderName: string
  message: string
  summary: string
}

/**
 * 관리자가 [반영]을 눌렀을 때만 실행. 원문과 함께 이력을 먼저 남기고 상태를 바꾼다 (RULE.md 0-4, 5장)
 * delay → 제출 예정 + 예정일, submitted → 제출, 그 외 → 이력에 메모만
 */
export async function applySlack(a: Apply) {
  if (!supabase) throw new Error('Supabase 연결이 없어요')
  const content = `[슬랙] ${a.senderName}: "${a.message.trim()}" → ${a.summary}`
  const kind = a.type === 'delay' ? 'delay_notice' : a.type === 'submitted' ? 'submitted' : 'memo'
  const rows = a.docs.length
    ? a.docs.map((d) => ({ expense_id: a.expenseId, doc_id: d.id, kind, content, source: 'slack_paste' }))
    : [{ expense_id: a.expenseId, kind, content, source: 'slack_paste' }]
  const log = await supabase.from('activity_log').insert(rows)
  if (log.error) throw log.error

  if (!a.docs.length || (a.type !== 'delay' && a.type !== 'submitted')) return
  const patch = a.type === 'delay' ? { status: 'scheduled', planned_date: a.plannedDate } : { status: 'submitted' }
  const upd = await supabase.from('required_docs').update(patch).in('id', a.docs.map((d) => d.id))
  if (upd.error) throw upd.error
}
