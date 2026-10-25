import { invokeFunction } from './invokeFunction'
import { supabase } from './supabase'
import { formatDate } from './format'
import type { DashExpense, ProjectWithDeadline } from './useDashboard'

// 통보·재통보 (RULE.md 6장, 10장). 지금은 규칙으로 만든 기본 문장, AI 기능을 붙이면 초안을 AI가 쓴다.
// 같은 사람에게 보내는 횟수·간격 제한은 사용자 요청으로 두지 않는다 (재통보 여부는 문장과 이력 종류에만 쓴다)

/** 정중하게, 무엇이/왜/언제까지 + 어려우면 편하게 말해달라는 마무리 */
export function noticeTemplate(name: string, expenses: DashExpense[], projects: ProjectWithDeadline[], isRe: boolean): string {
  const lines = expenses.flatMap((e) => {
    const docs = e.required_docs.filter((d) => d.status !== 'submitted')
    if (!docs.length) return []
    const docText = docs
      .map((d) => (d.state === 'overdue' ? `${d.doc_type}(약속일 ${formatDate(d.planned_date!)} 지남)` : d.doc_type))
      .join(', ')
    return [`• ${formatDate(e.paid_at)} ${e.description ?? ''} — ${docText}`]
  })
  const deadlines = projects
    .filter((p) => p.deadline && expenses.some((e) => e.project_id === p.id))
    .map((p) => p.deadline!)
    .sort()
  const by = deadlines[0] ? `${formatDate(deadlines[0])}(사내 마감)까지` : '가능한 빨리'
  return [
    `안녕하세요 ${name}님, 사업비 담당자입니다.`,
    isRe
      ? '지난번에 부탁드린 증빙 중 아직 확인되지 않은 서류가 있어 다시 한번 안내드려요.'
      : '이번 달 사업비 정산을 위해 아래 증빙이 필요해요.',
    '',
    ...lines,
    '',
    `정산 기한을 맞추려면 ${by} 보내주시면 큰 도움이 돼요.`,
    '혹시 준비가 어렵거나 일정 조율이 필요하면 편하게 말씀해 주세요. 감사합니다!',
  ].join('\n')
}

/** 이 사람에게 마지막으로 보낸 시각 (처리 이력 기준) */
export async function lastNoticeAt(expenseIds: string[]): Promise<string | null> {
  if (!supabase || !expenseIds.length) return null
  const { data } = await supabase
    .from('activity_log')
    .select('created_at')
    .in('expense_id', expenseIds)
    .in('kind', ['notice_sent', 're_notice_sent'])
    .order('created_at', { ascending: false })
    .limit(1)
  return data?.[0]?.created_at ?? null
}

/** 관리자가 [보내기]를 눌렀을 때만 실행. 슬랙 발송은 Edge Function에서만 (키를 화면에 두지 않음) */
export async function sendNotice(personId: string, text: string, expenseIds: string[], isRe: boolean) {
  if (!supabase) throw new Error('Supabase 연결이 없어요')
  await invokeFunction('slack-notify', { person_id: personId, text }, '슬랙 발송')
  // 발송 기록은 감사 소명 근거라 집행 건마다 남긴다 (RULE.md 6장)
  const log = await supabase.from('activity_log').insert(
    expenseIds.map((id) => ({ expense_id: id, kind: isRe ? 're_notice_sent' : 'notice_sent', content: text, source: 'manual' })),
  )
  if (log.error) throw log.error
}

/** 이 사람에게 지금까지 보낸 통보 횟수 (0이면 첫 통보) */
export async function noticeCount(expenseIds: string[]): Promise<number> {
  if (!supabase || !expenseIds.length) return 0
  const { count } = await supabase
    .from('activity_log')
    .select('id', { count: 'exact', head: true })
    .in('expense_id', expenseIds)
    .in('kind', ['notice_sent', 're_notice_sent'])
  // 한 번 보낼 때 집행 건마다 기록하므로, 건수로 나눠 대략의 횟수로 본다
  return Math.round((count ?? 0) / Math.max(1, expenseIds.length))
}
