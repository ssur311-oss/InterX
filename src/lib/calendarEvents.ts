import { formatDate } from './format'
import { reminderDates } from './rules/deadline'
import { occurrences, scheduleDocs } from './schedules'
import { REPEAT_LABEL, type Person, type Schedule } from './types'
import type { DashExpense, ProjectWithDeadline } from './useDashboard'

// 캘린더 일정 (F5): 공통 마감(정산 기한·사내 마감·리마인드) + 개별 제출 예정일
export type CalTone = 'settlement' | 'deadline' | 'remind' | 'overdue' | 'over_deadline' | 'planned' | 'schedule'

export type CalItem = {
  id: string
  date: string
  tone: CalTone
  projectId: string
  title: string
  lines: string[]
}

export const TONE_ICON: Record<CalTone, string> = {
  settlement: '🏁',
  deadline: '📌',
  remind: '🔔',
  overdue: '🔴',
  over_deadline: '⚠️',
  planned: '⏳',
  schedule: '🔁',
}

export const TONE_LABEL: Record<CalTone, string> = {
  settlement: '정산 기한',
  deadline: '사내 마감',
  remind: '리마인드',
  overdue: '약속일 경과',
  over_deadline: '변동 사항',
  planned: '제출 예정',
  schedule: '반복 일정',
}

/** 같은 날 화면에 보이는 순서 */
export const TONE_ORDER: CalTone[] = ['deadline', 'settlement', 'schedule', 'remind', 'overdue', 'over_deadline', 'planned']

function commonItems(p: ProjectWithDeadline, remindDays: number[], holidays: Set<string>): CalItem[] {
  const items: CalItem[] = []
  if (p.settlement_deadline) {
    items.push({
      id: `settle-${p.id}`, date: p.settlement_deadline, tone: 'settlement', projectId: p.id,
      title: `${p.short_name} 정산 기한`, lines: [`전문기관 ${p.agency ?? ''} 정산 기한`.trim()],
    })
  }
  if (p.deadline) {
    items.push({
      id: `deadline-${p.id}`, date: p.deadline, tone: 'deadline', projectId: p.id,
      title: `${p.short_name} 사내 마감`,
      lines: [`정산 기한 ${formatDate(p.settlement_deadline!)}에서 영업일 ${p.internal_buffer_days}일 전`, '이 달 모든 증빙의 공통 마감일'],
    })
    for (const r of reminderDates(p.deadline, remindDays, holidays)) {
      items.push({
        id: `remind-${p.id}-${r.date}`, date: r.date, tone: 'remind', projectId: p.id,
        title: `${p.short_name} 리마인드 ${r.label}`, lines: [`사내 마감 ${formatDate(p.deadline)} 전 안내`],
      })
    }
  }
  return items
}

/** 제출 예정 증빙을 같은 날·같은 사람·같은 과제끼리 묶는다 */
function plannedItems(expenses: DashExpense[], people: Person[]): CalItem[] {
  const groups = new Map<string, { date: string; projectId: string; person: string; docs: { doc: string; what: string; tone: CalTone }[] }>()
  for (const e of expenses) {
    for (const d of e.required_docs) {
      if (d.status !== 'scheduled' || !d.planned_date) continue
      const person = people.find((p) => p.id === e.owner_id)?.name ?? '사용자 미지정'
      const key = `${d.planned_date}|${e.owner_id}|${e.project_id}`
      const tone: CalTone = d.state === 'overdue' || d.state === 'over_deadline' ? d.state : 'planned'
      const g = groups.get(key) ?? { date: d.planned_date, projectId: e.project_id, person, docs: [] }
      g.docs.push({ doc: d.doc_type, what: e.description ?? '', tone })
      groups.set(key, g)
    }
  }
  return [...groups].map(([key, g]) => {
    const tone = TONE_ORDER.find((t) => g.docs.some((d) => d.tone === t)) ?? 'planned'
    return {
      id: `planned-${key}`, date: g.date, tone, projectId: g.projectId,
      title: `${g.person} · ${g.docs.length === 1 ? g.docs[0].doc : `증빙 ${g.docs.length}개`}`,
      lines: g.docs.map((d) => `${TONE_ICON[d.tone]} ${d.doc} — ${d.what}`),
    }
  })
}

/** 반복·고정 일정 (매월 마감, 급여 정산일, 감사 등). from~to 사이만 펼친다 */
function scheduleItems(schedules: Schedule[], holidays: Set<string>, from: string, to: string): CalItem[] {
  return schedules.flatMap((s) =>
    occurrences(s, from, to, holidays).map((date) => {
      const docs = scheduleDocs(s)
      return {
        id: `schedule-${s.id}-${date}`, date, tone: 'schedule' as const, projectId: s.project_id ?? '',
        title: `[${s.kind}] ${s.title}`,
        lines: [`${REPEAT_LABEL[s.repeat]} · ${s.remind_days}일 전부터 알림`, ...(docs.length ? [`준비 서류: ${docs.join(', ')}`] : [])],
      }
    }),
  )
}

export function buildCalendarItems(
  projects: ProjectWithDeadline[],
  expenses: DashExpense[],
  people: Person[],
  remindDays: number[],
  holidays: Set<string>,
  schedules: Schedule[] = [],
  range: { from: string; to: string } = { from: '2000-01-01', to: '2000-01-01' },
): CalItem[] {
  return [
    ...projects.flatMap((p) => commonItems(p, remindDays, holidays)),
    ...plannedItems(expenses, people),
    ...scheduleItems(schedules, holidays, range.from, range.to),
  ]
}
