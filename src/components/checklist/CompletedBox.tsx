import { useState } from 'react'
import { ChevronDown, FolderCheck } from 'lucide-react'
import { formatDate, formatWon } from '../../lib/format'
import type { DashDoc, DashExpense, ProjectWithDeadline } from '../../lib/useDashboard'
import { ExpenseCard } from './ExpenseCard'

type Props = {
  expenses: DashExpense[]
  projects: ProjectWithDeadline[]
  onToggle: (e: DashExpense, doc: DashDoc, checked: boolean) => void
}

/** 완료함: 서류가 다 모인 집행 건을 과제별로 한곳에 모아 둔다 */
export function CompletedBox({ expenses, projects, onToggle }: Props) {
  const [open, setOpen] = useState<string | null>(null)
  const groups = projects
    .map((p) => ({ p, rows: expenses.filter((e) => e.project_id === p.id) }))
    .filter((g) => g.rows.length > 0)

  return (
    <div className="space-y-6">
      {groups.map(({ p, rows }) => (
        <section key={p.id} className="glass overflow-hidden rounded-2xl">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-6 py-4">
            <h2 className="flex items-center gap-2 text-xl font-semibold">
              <FolderCheck aria-hidden size={20} className="text-ok" />
              {p.short_name}
            </h2>
            <span className="text-[15px] text-body">
              완료 <b className="text-ink">{rows.length}건</b> · 합계 <b className="text-ink">{formatWon(rows.reduce((n, e) => n + e.amount, 0))}</b>
            </span>
          </div>
          <ul className="divide-y divide-line">
            {rows.map((e) => (
              <li key={e.id}>
                <button
                  onClick={() => setOpen(open === e.id ? null : e.id)}
                  aria-expanded={open === e.id}
                  className="grid min-h-14 w-full grid-cols-[1fr_auto_auto] items-center gap-4 px-6 py-2 text-left hover:bg-white/50"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{e.description}</span>
                    <span className="block truncate text-[13px] text-body">
                      {formatDate(e.paid_at)} · {e.category} · {e.people?.name ?? '담당자 없음'} · 서류 {e.required_docs.length}개
                    </span>
                  </span>
                  <span className="tabular-nums">{formatWon(e.amount)}</span>
                  <ChevronDown aria-hidden size={18} className={`text-body transition-transform ${open === e.id ? 'rotate-180' : ''}`} />
                </button>
                {open === e.id && (
                  <div className="px-4 pb-4">
                    <ExpenseCard expense={e} projectName={p.short_name}
                      onToggle={(d, c) => onToggle(e, d, c)} />
                    <p className="mt-2 px-2 text-[13px] text-body">체크를 풀면 이 건은 다시 '처리 중'으로 돌아가요.</p>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
