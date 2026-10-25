import { TONE_ICON, TONE_LABEL, TONE_ORDER, type CalItem } from '../../lib/calendarEvents'
import { formatDate } from '../../lib/format'
import { Card } from '../ui'

const TONE_BORDER: Record<CalItem['tone'], string> = {
  settlement: 'border-ink',
  deadline: 'border-brand',
  remind: 'border-gray-400',
  overdue: 'border-danger',
  over_deadline: 'border-warn',
  planned: 'border-body',
}

/** 선택한 날의 일정 목록 */
export function DayPanel({ date, items, isHoliday }: { date: string; items: CalItem[]; isHoliday: boolean }) {
  const sorted = [...items].sort((a, b) => TONE_ORDER.indexOf(a.tone) - TONE_ORDER.indexOf(b.tone))
  return (
    <Card>
      <h3 className="mb-1 text-xl font-bold">{formatDate(date)}</h3>
      <p className="mb-4 text-[13px] text-body">{isHoliday ? '공휴일 · ' : ''}일정 {items.length}개</p>
      {sorted.length === 0 ? (
        <p className="rounded-lg bg-canvas p-4 text-[13px] text-body">이 날은 일정이 없어요. 달력에서 다른 날을 눌러 보세요.</p>
      ) : (
        <ul className="space-y-4">
          {sorted.map((item) => (
            <li key={item.id} className={`border-l-[3px] pl-3 ${TONE_BORDER[item.tone]}`}>
              <div className="text-[13px] text-body">{TONE_ICON[item.tone]} {TONE_LABEL[item.tone]}</div>
              <div className="font-semibold">{item.title}</div>
              {item.lines.map((l) => (
                <div key={l} className="text-[13px] text-body">{l}</div>
              ))}
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
