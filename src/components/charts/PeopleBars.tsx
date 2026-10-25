import type { DashExpense } from '../../lib/useDashboard'

/** 사람별로 아직 안 낸 서류 수. 이름을 누르면 그 사람에게 보낼 슬랙 메시지 창이 열린다 */
export function PeopleBars({ expenses, onSelect }: { expenses: DashExpense[]; onSelect: (ownerId: string) => void }) {
  const byPerson = new Map<string, { name: string; overdue: number; left: number }>()
  for (const e of expenses) {
    if (!e.owner_id) continue
    const cur = byPerson.get(e.owner_id) ?? { name: e.people?.name ?? '', overdue: 0, left: 0 }
    for (const d of e.required_docs) {
      if (d.state === 'submitted') continue
      cur.left += 1
      if (d.state === 'overdue') cur.overdue += 1
    }
    byPerson.set(e.owner_id, cur)
  }
  const rows = [...byPerson.entries()]
    .filter(([, v]) => v.left > 0)
    .sort((a, b) => b[1].overdue - a[1].overdue || b[1].left - a[1].left)
  const max = Math.max(1, ...rows.map(([, v]) => v.left))

  if (rows.length === 0) return <p className="text-body">모든 사람이 서류를 다 냈어요.</p>

  return (
    <ul className="space-y-1">
      {rows.map(([id, v]) => (
        <li key={id}>
          <button onClick={() => onSelect(id)} aria-haspopup="dialog"
            title={`${v.name}: 남은 서류 ${v.left}개${v.overdue ? `, 그중 약속일 경과 ${v.overdue}개` : ''} · 눌러서 슬랙 메시지 보내기`}
            className="grid min-h-11 w-full grid-cols-[72px_1fr_auto] items-center gap-3 rounded-lg px-1 text-left text-[15px] hover:bg-white/70">
            <span className="truncate font-medium text-brand underline-offset-4 hover:underline">{v.name}</span>
            <div className="h-2.5 rounded-full bg-[rgb(17_24_39/0.06)]">
              <span className="block h-full rounded-full bg-brand" style={{ width: `${(v.left / max) * 100}%` }} />
            </div>
            <span className="tabular-nums">
              <b>{v.left}</b>
              {v.overdue > 0 && <span className="ml-2 text-[13px] font-medium text-danger">경과 {v.overdue}</span>}
            </span>
          </button>
        </li>
      ))}
    </ul>
  )
}
