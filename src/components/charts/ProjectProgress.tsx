import { daysBetween } from '../../lib/date'
import { formatDate } from '../../lib/format'
import { STATE_LABEL, type DocState } from '../../lib/rules/docStatus'
import type { DashExpense, ProjectWithDeadline } from '../../lib/useDashboard'
import { STATE_FILL } from './EvidenceDonut'

const BAR_ORDER: DocState[] = ['submitted', 'scheduled', 'missing', 'over_deadline', 'overdue']

function dDay(today: string, deadline: string) {
  const left = daysBetween(today, deadline)
  return left > 0 ? `D-${left}` : left === 0 ? 'D-day' : `D+${-left}`
}

/** 과제별 증빙 진행 막대 + 사내 마감 D-day. 막대 조각에 마우스를 올리면 상태와 개수 */
export function ProjectProgress({ projects, expenses, today }: { projects: ProjectWithDeadline[]; expenses: DashExpense[]; today: string }) {
  return (
    <ul className="space-y-6">
      {projects.map((p) => {
        const docs = expenses.filter((e) => e.project_id === p.id).flatMap((e) => e.required_docs)
        const done = docs.filter((d) => d.state === 'submitted').length
        const pct = docs.length ? Math.round((done / docs.length) * 100) : 0
        const urgent = p.deadline ? daysBetween(today, p.deadline) <= 3 : false
        return (
          <li key={p.id}>
            <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
              <span className="font-semibold">{p.short_name}</span>
              <span className="flex items-center gap-2 text-[13px] text-body">
                {p.deadline ? <>사내 마감 {formatDate(p.deadline)}</> : '정산 기한 미입력'}
                {p.deadline && (
                  <b className={`rounded-full px-2 py-0.5 ${urgent ? 'bg-[#fdecea] text-danger' : 'bg-white/70 text-ink'}`}>
                    {dDay(today, p.deadline)}
                  </b>
                )}
              </span>
            </div>
            <div className="flex h-3 gap-0.5 overflow-hidden rounded-full bg-[rgb(17_24_39/0.06)]" role="img"
              aria-label={`${p.short_name} 서류 ${docs.length}개 중 ${done}개 제출`}>
              {BAR_ORDER.map((s) => {
                const n = docs.filter((d) => d.state === s).length
                if (!n) return null
                return (
                  <span key={s} title={`${STATE_LABEL[s]} ${n}개`} className="h-full first:rounded-l-full last:rounded-r-full"
                    style={{ width: `${(n / docs.length) * 100}%`, background: STATE_FILL[s] }} />
                )
              })}
            </div>
            <div className="mt-2 text-[13px] text-body">
              서류 {docs.length}개 중 <b className="text-ink">{done}개 제출</b> ({pct}%)
            </div>
          </li>
        )
      })}
    </ul>
  )
}
