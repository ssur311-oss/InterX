import { Check } from 'lucide-react'
import { formatDate, formatWon } from '../../lib/format'
import { PAY_METHOD_LABEL } from '../../lib/types'
import type { DashDoc, DashExpense } from '../../lib/useDashboard'
import { StatusText } from '../StatusBadge'

type Props = {
  expense: DashExpense
  projectName: string
  leaving?: boolean
  onToggle: (doc: DashDoc, checked: boolean) => void
}

/** 집행 건 하나 = 카드 하나. 필요한 서류마다 체크 칸이 있다 */
// 위험 확인 태그는 AI 기능을 붙일 때 다시 넣는다
export function ExpenseCard({ expense: e, projectName, leaving, onToggle }: Props) {
  const done = e.required_docs.filter((d) => d.status === 'submitted').length
  const total = e.required_docs.length

  return (
    <article className={`glass rounded-2xl p-5 ${leaving ? 'animate-leave' : ''}`}>
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
        <div className="min-w-0">
          <h3 className="text-lg font-semibold">{e.description || '(적요 없음)'}</h3>
          <p className="mt-1 text-[13px] text-body">
            <b className="text-ink">{projectName}</b> · {e.category}{e.sub_category && ` / ${e.sub_category}`} · {PAY_METHOD_LABEL[e.pay_method]}
            {e.vendor && ` · ${e.vendor}`} · {e.people?.name ?? '담당자 없음'} · {formatDate(e.paid_at)}
          </p>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold tabular-nums">{formatWon(e.amount)}</div>
          <div className="text-[13px] text-body">
            서류 <b className={done === total ? 'text-ok' : 'text-ink'}>{done}/{total}</b>
          </div>
        </div>
      </div>

      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[rgb(17_24_39/0.06)]" aria-hidden>
        <span className="block h-full rounded-full bg-ok transition-[width] duration-300" style={{ width: `${total ? (done / total) * 100 : 0}%` }} />
      </div>

      <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {e.required_docs.map((d) => {
          const checked = d.status === 'submitted'
          return (
            <li key={d.id}>
              <button
                role="checkbox"
                aria-checked={checked}
                onClick={() => onToggle(d, !checked)}
                className={`flex min-h-14 w-full items-center gap-3 rounded-xl border px-3 text-left transition-colors ${
                  checked ? 'border-ok/30 bg-ok/10' : 'border-white/90 bg-white/70 hover:border-brand/40 hover:bg-white'
                }`}
              >
                <span aria-hidden className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 ${
                  checked ? 'border-ok bg-ok text-white' : 'border-muted bg-white'
                }`}>
                  {checked && <Check size={16} strokeWidth={3} />}
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-medium">{d.doc_type}</span>
                  <StatusText state={d.state} plannedDate={d.planned_date} />
                </span>
              </button>
            </li>
          )
        })}
      </ul>

    </article>
  )
}
