import { useState } from 'react'
import { budgetByCategory, budgetTotal, type BudgetRow } from '../../lib/budget'
import { formatWon } from '../../lib/format'
import type { BudgetItem } from '../../lib/types'
import type { DashExpense, ProjectWithDeadline } from '../../lib/useDashboard'

export const pctText = (n: number) => `${n.toFixed(1)}%`

/** 집행률 막대 목록. 예산을 넘으면 빨간 막대 */
export function BudgetBars({ rows }: { rows: BudgetRow[] }) {
  return (
    <>
      <ul className="space-y-4">
        {rows.map((r) => (
          <li key={r.key} title={`${r.label}: ${formatWon(r.spent)} / ${formatWon(r.planned)}`}>
            <div className="mb-1 flex justify-between gap-2 text-[15px]">
              <span>{r.label}</span>
              <span className="tabular-nums">
                <b>{pctText(r.rate)}</b>
                <span className="ml-2 text-[13px] text-body">{formatWon(r.spent)} / {formatWon(r.planned)}</span>
              </span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-[rgb(17_24_39/0.06)]">
              <span className={`block h-full rounded-full ${r.rate > 100 ? 'bg-danger' : 'bg-brand'}`}
                style={{ width: `${Math.min(r.rate, 100)}%` }} />
            </div>
          </li>
        ))}
      </ul>
      {rows.some((r) => r.rate > 100) && (
        <p className="mt-4 text-[13px] text-danger">빨간 막대는 예산보다 많이 쓴 항목이에요. 확인이 필요해요.</p>
      )}
    </>
  )
}

/** 비목별 예산 집행률 (F10). 과제 탭으로 범위를 바꾼다 */
export function BudgetChart({ budget, projects, expenses }: { budget: BudgetItem[]; projects: ProjectWithDeadline[]; expenses: DashExpense[] }) {
  const [projectId, setProjectId] = useState('')
  const rows = budgetByCategory(budget, expenses, projectId)
  const total = budgetTotal(rows)

  const tab = (id: string, label: string) => (
    <button key={id || 'all'} onClick={() => setProjectId(id)} aria-pressed={projectId === id}
      className={`min-h-11 rounded-full px-4 text-[15px] ${projectId === id ? 'bg-ink font-semibold text-white' : 'text-body hover:bg-white/70'}`}>
      {label}
    </button>
  )

  return (
    <div>
      <div className="mb-6 flex flex-wrap gap-1">
        {tab('', '전체')}
        {projects.map((p) => tab(p.id, p.short_name))}
      </div>
      <div className="mb-6 flex flex-wrap items-end gap-x-8 gap-y-2">
        <div>
          <div className="text-[13px] text-body">집행률</div>
          <div className="text-[40px] leading-none font-bold tracking-tight text-brand">{pctText(total.rate)}</div>
        </div>
        <div className="text-[15px] text-body">
          집행 <b className="text-ink">{formatWon(total.spent)}</b> / 예산 {formatWon(total.planned)}
          <div>잔액 <b className="text-ink">{formatWon(total.planned - total.spent)}</b></div>
        </div>
      </div>
      <BudgetBars rows={rows} />
    </div>
  )
}
