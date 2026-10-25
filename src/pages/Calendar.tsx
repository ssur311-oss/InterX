import { useMemo, useState } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import koLocale from '@fullcalendar/core/locales/ko'
import { DayPanel } from '../components/calendar/DayPanel'
import { UpcomingDeadlines } from '../components/calendar/UpcomingDeadlines'
import { Card, PageHeader, Workspace } from '../components/ui'
import { buildCalendarItems, TONE_ICON, TONE_LABEL, TONE_ORDER } from '../lib/calendarEvents'
import { parseHolidays, parseRemindDays } from '../lib/rules/deadline'
import { useDashboard } from '../lib/useDashboard'

const pad = (n: number) => String(n).padStart(2, '0')
// FullCalendar는 브라우저 시간대(한국)로 날짜를 주므로 그 날짜 그대로 문자열로 바꾼다
const toDateStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

export default function Calendar() {
  const { expenses, projects, people, settings, today, error, loading } = useDashboard()
  const [projectId, setProjectId] = useState('')
  const [selected, setSelected] = useState(today)

  const holidays = useMemo(() => parseHolidays(settings), [settings])
  const items = useMemo(
    () =>
      buildCalendarItems(projects, expenses, people, parseRemindDays(settings), holidays).filter(
        (i) => !projectId || i.projectId === projectId,
      ),
    [projects, expenses, people, settings, holidays, projectId],
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
    <Workspace>
      <PageHeader
        title="마감 캘린더"
        desc="정산 기한에서 거꾸로 계산한 사내 마감·리마인드와, 사람별 제출 약속을 함께 봐요."
        action={
          <select value={projectId} onChange={(e) => setProjectId(e.target.value)} aria-label="과제 필터"
            className="min-h-12 rounded-lg border border-line bg-white px-4">
            <option value="">전체 과제</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.short_name}</option>)}
          </select>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_304px]">
        <Card className="min-w-0">
          <FullCalendar
            plugins={[dayGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            initialDate={today}
            locale={koLocale}
            headerToolbar={{ left: 'title', center: '', right: 'prev,today,next' }}
            height="auto"
            fixedWeekCount={false}
            dayMaxEvents={3}
            events={events}
            eventOrder="order,title"
            dateClick={(info) => setSelected(info.dateStr)}
            eventClick={(info) => setSelected(info.event.startStr)}
            dayCellClassNames={(arg) => {
              const d = toDateStr(arg.date)
              return [holidays.has(d) ? 'is-holiday' : '', d === selected ? 'is-selected' : ''].filter(Boolean)
            }}
          />
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-body">
            {TONE_ORDER.map((t) => <span key={t}>{TONE_ICON[t]} {TONE_LABEL[t]}</span>)}
          </div>
        </Card>

        <div className="space-y-6">
          <DayPanel date={selected} items={items.filter((i) => i.date === selected)} isHoliday={holidays.has(selected)} />
          <UpcomingDeadlines projects={projects} expenses={expenses} today={today} />
        </div>
      </div>
    </Workspace>
  )
}
