import { Check, CircleAlert, CircleDashed, Clock, TriangleAlert } from 'lucide-react'
import { formatDate } from '../lib/format'
import { STATE_LABEL, type DocState } from '../lib/rules/docStatus'

// 상태는 색 + 아이콘 + 글자를 함께 쓴다 (색만으로 구분하지 않음)
const ICON: Record<DocState, typeof Check> = {
  overdue: CircleAlert,
  over_deadline: TriangleAlert,
  missing: CircleDashed,
  scheduled: Clock,
  submitted: Check,
}

export const STATE_TONE: Record<DocState, string> = {
  overdue: 'text-danger',
  over_deadline: 'text-ink',
  missing: 'text-body',
  scheduled: 'text-brand',
  submitted: 'text-ok',
}

export function StateIcon({ state, size = 16 }: { state: DocState; size?: number }) {
  const Icon = ICON[state]
  // 노란색 글자는 대비가 낮아 아이콘에만 쓰고 글자는 진하게 둔다
  const tone = state === 'over_deadline' ? 'text-warn' : STATE_TONE[state]
  return <Icon aria-hidden size={size} className={tone} strokeWidth={2.25} />
}

/** "약속일 경과 10/23(금)" 처럼 상태와 날짜를 함께 보여준다 */
export function StatusText({ state, plannedDate }: { state: DocState; plannedDate?: string | null }) {
  const date = plannedDate && state !== 'submitted' && state !== 'missing' ? ` ${formatDate(plannedDate)}` : ''
  return (
    <span className={`inline-flex items-center gap-1 text-[13px] font-medium ${STATE_TONE[state]}`}>
      <StateIcon state={state} size={14} />
      {STATE_LABEL[state]}
      {date}
    </span>
  )
}
