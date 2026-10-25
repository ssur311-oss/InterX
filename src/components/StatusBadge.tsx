import { formatDate } from '../lib/format'
import { STATE_ICON, STATE_LABEL, type DocState } from '../lib/rules/docStatus'

const STYLE: Record<DocState, string> = {
  overdue: 'bg-red-100 text-red-800 font-semibold',
  over_deadline: 'bg-amber-100 text-amber-900',
  missing: 'bg-red-50 text-red-700',
  scheduled: 'bg-sky-50 text-sky-800',
  submitted: 'bg-green-50 text-green-800',
}

export function StatusBadge({ docType, state, plannedDate }: { docType: string; state: DocState; plannedDate?: string | null }) {
  const date = plannedDate && state !== 'submitted' && state !== 'missing' ? ` ${formatDate(plannedDate)}` : ''
  return (
    <span title={STATE_LABEL[state]} className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs ${STYLE[state]}`}>
      {STATE_ICON[state]} {docType}
      {date}
    </span>
  )
}
