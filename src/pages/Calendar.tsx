import { useMemo, useState } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import multiMonthPlugin from '@fullcalendar/multimonth'
import koLocale from '@fullcalendar/core/locales/ko'
import { DayPanel } from '../components/calendar/DayPanel'
import { UpcomingDeadlines } from '../components/calendar/UpcomingDeadlines'
import { Card, PageHeader, SELECT, Workspace } from '../components/ui'
import { buildCalendarItems, TONE_ICON, TONE_LABEL, TONE_ORDER } from '../lib/calendarEvents'
import { addDays } from '../lib/date'
import { parseHolidays, parseRemindDays } from '../lib/rules/deadline'
import type { Schedule } from '../lib/types'
import { useRows } from '../lib/useRows'
import { useDashboard } from '../lib/useDashboard'

const pad = (n: number) => String(n).padStart(2, '0')
// FullCalendar는 브라우저 시간대(한국)로 날짜를 주므로 그 날짜 그대로 문자열로 바꾼다
const toDateStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

type Scope = 'month' | 'quarter' | 'year'
const SCOPES: { key: Scope; label: string; view: string }[] = [
  { key: 'month', label: '월', view: 'dayGridMonth' },
  { key: 'quarter', label: '분기', view: 'multiMonthQuarter' },
  { key: 'year', label: '연도', view: 'multiMonthYear' },
]

/** 분기 보기는 그 분기 첫 달부터 3개월, 연도 보기는 1월부터 */
function scopeStart(today: string, scope: Scope) {
  const [y, m] = today.split('-').map(Number)
  if (scope === 'quarter') return `${y}-${pad(Math.floor((m - 1) / 3) * 3 + 1)}-01`
  if (scope === 'year') return `${y}-01-01`
  return today
}

export default function Calendar() {
  const { expenses, projects, people, settings, today, error, loading } = useDashboard()
  const [projectId, setProjectId] = useState('')
  const [selected, setSelected] = useState(today)
  const [scope, setScope] = useState<Scope>('month')
  const { rows: schedules } = useRows<Schedule>('schedules', 'base_date')

  const holidays = useMemo(() => parseHolidays(settings), [settings])
  const items = useMemo(
    () =>
      // 반복 일정은 앞뒤 1~2년만 펼친다 (연도 보기에서 넘겨 볼 정도)
      buildCalendarItems(projects, expenses, people, parseRemindDays(settings), holidays, schedules, {
        from: addDays(today, -400), to: addDays(today, 800),
      }).filter((i) => !projectId || !i.projectId || i.projectId === projectId),
    [projects, expenses, people, settings, holidays, projectId, schedules, today],
  )
  const events = items.map((i) => ({
    id: i.id,
    title: `${TONE_ICON[i.tone]} ${i.title}`,
    start: i.date,
    allDay: true,
    classNames: ['ev', `ev-${i.tone}`],
    extendedProps: { order: TONE_ORDER.indexOf(i.tone) },
  }))

  if (loading) return <Workspace><p className="text-body">불러오는 중…</p></Workspace>
  if (error) return <Workspace><p className="text-red-700">데이터를 불러오지 못했어요: {error}</p></Workspace>

  return (
    <Workspace fit>
      <PageHeader
        title="마감 캘린더"
        desc="사내 마감·정산 기한, 매월 반복 일정(급여 정산·카드 마감 등), 사람별 제출 약속을 한눈에 봐요."
        action={
          <div className="flex flex-wrap items-center gap-2">
          <div className="glass inline-flex gap-1 rounded-xl p-1" role="group" aria-label="보기 범위">
            {SCOPES.map((s) => (
              <button key={s.key} onClick={() => setScope(s.key)} aria-pressed={scope === s.key}
                className={`min-h-11 rounded-lg px-4 ${scope === s.key ? 'bg-white font-semibold text-ink shadow-sm' : 'text-body hover:bg-white/50'}`}>
                {s.label}
              </button>
            ))}
          </div>
          <select value={projectId} onChange={(e) => setProjectId(e.target.value)} aria-label="과제 필터"
            className={SELECT}>
            <option value="">전체 과제</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.short_name}</option>)}
          </select>
          </div>
        }
      />

      <div className="grid gap-6 md:min-h-0 md:flex-1 lg:grid-cols-[minmax(0,1fr)_304px] lg:grid-rows-[minmax(0,1fr)]">
        <Card className="flex min-w-0 flex-col md:min-h-0">
          {/* 화면 전체 축소(zoom) 안에서는 달력 부품이 칸 너비를 잘못 재므로, 이 영역만 축소를 풀고 글자 크기로 비율을 맞춘다 */}
          <div className="fc-unzoom h-[560px] md:h-auto md:min-h-0 md:flex-1">
          <FullCalendar
            key={scope}
            plugins={[dayGridPlugin, interactionPlugin, multiMonthPlugin]}
            initialView={SCOPES.find((s) => s.key === scope)!.view}
            initialDate={scopeStart(today, scope)}
            views={{
              // 분기는 3달, 연도는 4달씩 나란히 (기본 최소 너비 350px이면 한 줄에 한 달만 들어가서 줄임)
              multiMonthQuarter: { type: 'multiMonth', duration: { months: 3 }, multiMonthMaxColumns: 3, multiMonthMinWidth: 150 },
              multiMonthYear: { multiMonthMaxColumns: 4, multiMonthMinWidth: 120 },
            }}
            locale={koLocale}
            headerToolbar={{ left: 'title', center: '', right: 'prev,today,next' }}
            height="100%"
            fixedWeekCount={false}
            dayMaxEvents
            // 분기·연도 보기는 칸이 작아서 '일'·'개'를 빼고 숫자만 (자세한 내용은 날짜를 눌러 오른쪽에서)
            dayCellContent={scope === 'month' ? undefined : (arg) => arg.dayNumberText.replace('일', '')}
            moreLinkContent={scope === 'month' ? undefined : (arg) => `+${arg.num}`}
            events={events}
            eventOrder="order,title"
            dateClick={(info) => setSelected(info.dateStr)}
            eventClick={(info) => setSelected(info.event.startStr)}
            dayCellClassNames={(arg) => {
              const d = toDateStr(arg.date)
              return [holidays.has(d) ? 'is-holiday' : '', d === selected ? 'is-selected' : ''].filter(Boolean)
            }}
          />
          </div>
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-body">
            {TONE_ORDER.map((t) => <span key={t}>{TONE_ICON[t]} {TONE_LABEL[t]}</span>)}
          </div>
        </Card>

        <div className="space-y-6 lg:min-h-0 lg:overflow-y-auto">
          <DayPanel date={selected} items={items.filter((i) => i.date === selected)} isHoliday={holidays.has(selected)} />
          <UpcomingDeadlines projects={projects} expenses={expenses} today={today} />
        </div>
      </div>
    </Workspace>
  )
}
