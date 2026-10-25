import { daysBetween } from '../../lib/date'
import { formatDate } from '../../lib/format'
import type { DashExpense, ProjectWithDeadline } from '../../lib/useDashboard'
import { Card } from '../ui'

/** 과제별 사내 마감 D-day와 증빙 제출 진행률 (와이어프레임 "다가오는 사내 마감") */
export function UpcomingDeadlines({ projects, expenses, today }: { projects: ProjectWithDeadline[]; expenses: DashExpense[]; today: string }) {
  const list = projects
    .filter((p) => p.deadline)
    .sort((a, b) => a.deadline!.localeCompare(b.deadline!))

  return (
    <Card>
      <h3 className="mb-2 text-xl font-bold">다가오는 사내 마감</h3>
      {list.length === 0 && <p className="text-[13px] text-body">설정에서 과제의 정산 기한을 입력하면 마감이 계산돼요.</p>}
      {list.map((p) => {
        const docs = expenses.filter((e) => e.project_id === p.id).flatMap((e) => e.required_docs)
        const done = docs.filter((d) => d.status === 'submitted').length
        const left = daysBetween(today, p.deadline!)
        const pct = docs.length ? Math.round((done / docs.length) * 100) : 0
        return (
          <div key={p.id} className="border-b border-line py-4 last:border-0">
            <div className="flex items-center justify-between">
              <b>{p.short_name}</b>
              <span className={`rounded px-2 py-1 text-[13px] ${left <= 3 ? 'bg-[#fdecea] text-danger' : 'bg-white/70'}`}>
                {left > 0 ? `D-${left}` : left === 0 ? 'D-day' : `D+${-left}`}
              </span>
            </div>
            <p className="text-[13px] text-body">
              {formatDate(p.deadline!)} · 정산 {formatDate(p.settlement_deadline!)}
            </p>
            <div className="my-2 h-2 overflow-hidden rounded-full bg-[rgb(17_24_39/0.06)]" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
              <span className="block h-full rounded-full bg-ok" style={{ width: `${pct}%` }} />
            </div>
            <span className="text-[13px] text-body">필요 서류 {docs.length}개 중 {done}개 제출 ({pct}%)</span>
          </div>
        )
      })}
    </Card>
  )
}
