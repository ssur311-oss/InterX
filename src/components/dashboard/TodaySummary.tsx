import { CalendarClock, CircleAlert, TriangleAlert } from 'lucide-react'
import { VIEW_LABEL, type SummaryView } from '../../lib/dashboardFilter'

const CARDS: { view: SummaryView; Icon: typeof CircleAlert; iconTone: string; hint: string }[] = [
  { view: 'overdue', Icon: CircleAlert, iconTone: 'text-danger', hint: '제출 약속이 지난 서류' },
  { view: 'today', Icon: CalendarClock, iconTone: 'text-brand', hint: '오늘 내겠다고 한 서류' },
  { view: 'over_deadline', Icon: TriangleAlert, iconTone: 'text-warn', hint: '사내 마감보다 늦어진 약속' },
]

/** 요약 카드 3개. 누르면 해당 건을 팝업으로 연다 (감싸는 격자는 부모가 정한다) */
export function TodaySummary({ counts, onSelect }: { counts: Record<SummaryView, number>; onSelect: (v: SummaryView) => void }) {
  return (
    <>
      {CARDS.map(({ view, Icon, iconTone, hint }) => (
        <button key={view} onClick={() => onSelect(view)} aria-haspopup="dialog"
          className="glass rounded-2xl p-5 text-left hover:bg-white/80">
          <div className="flex items-center gap-2 text-[15px] font-medium text-body">
            <Icon aria-hidden size={18} className={iconTone} />
            {VIEW_LABEL[view]}
          </div>
          <div className={`mt-2 text-[32px] leading-none font-bold ${counts[view] === 0 ? 'text-muted' : ''}`}>
            {counts[view]}
            <span className="ml-1 text-base font-medium text-body">개</span>
          </div>
          <div className="mt-2 text-[13px] text-body">{hint}</div>
        </button>
      ))}
    </>
  )
}
