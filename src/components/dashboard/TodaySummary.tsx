import type { View } from '../../lib/dashboardFilter'

const CARDS: { view: Exclude<View, 'all'>; icon: string; label: string; unit: string; tone: string }[] = [
  { view: 'overdue', icon: '🔴', label: '약속일 경과', unit: '개', tone: 'border-red-300 bg-red-50 text-red-900' },
  { view: 'today', icon: '📅', label: '오늘 제출 예정', unit: '개', tone: 'border-sky-300 bg-sky-50 text-sky-900' },
  { view: 'over_deadline', icon: '⚠️', label: '마감 넘는 예정', unit: '개', tone: 'border-amber-300 bg-amber-50 text-amber-900' },
  { view: 'missing', icon: '❌', label: '미제출 증빙', unit: '개', tone: 'border-gray-300 bg-white text-gray-900' },
  { view: 'risk', icon: '🔍', label: '위험 확인 필요', unit: '건', tone: 'border-orange-300 bg-orange-50 text-orange-900' },
]

type Props = { counts: Record<Exclude<View, 'all'>, number>; active: View; onSelect: (v: View) => void }

export function TodaySummary({ counts, active, onSelect }: Props) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {CARDS.map((c) => (
        <button
          key={c.view}
          onClick={() => onSelect(active === c.view ? 'all' : c.view)}
          className={`rounded-lg border p-3 text-left transition ${c.tone} ${
            active === c.view ? 'ring-2 ring-blue-500' : 'hover:shadow-sm'
          } ${counts[c.view] === 0 ? 'opacity-60' : ''}`}
        >
          <div className="text-sm">{c.icon} {c.label}</div>
          <div className="mt-1 text-2xl font-bold">
            {counts[c.view]}
            <span className="ml-0.5 text-sm font-normal">{c.unit}</span>
          </div>
        </button>
      ))}
    </div>
  )
}
