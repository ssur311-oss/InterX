import { addDays, daysBetween } from './date'
import { businessDayOnOrBefore } from './rules/deadline'
import type { Schedule } from './types'

const STEP: Record<Schedule['repeat'], number> = { once: 0, monthly: 1, quarterly: 3, yearly: 12 }

/** base_date의 '일'을 n개월 뒤로. 그 달에 없는 날(31일 등)은 말일로 */
function addMonths(base: string, n: number): string {
  const [y, m, d] = base.split('-').map(Number)
  const first = new Date(Date.UTC(y, m - 1 + n, 1))
  const last = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate()
  first.setUTCDate(Math.min(d, last))
  return first.toISOString().slice(0, 10)
}

/** from~to 사이에 일정이 실제로 잡히는 날짜들. 주말·공휴일이면 직전 영업일로 당긴다 (RULE.md 3장) */
export function occurrences(s: Schedule, from: string, to: string, holidays: Set<string>): string[] {
  const step = STEP[s.repeat]
  if (!step) return s.base_date >= from && s.base_date <= to ? [businessDayOnOrBefore(s.base_date, holidays)] : []
  const out: string[] = []
  for (let i = 0; i < 600; i++) {
    const raw = addMonths(s.base_date, i * step)
    if (raw > addDays(to, 7)) break
    const date = businessDayOnOrBefore(raw, holidays)
    if (date >= from && date <= to) out.push(date)
  }
  return out
}

export const scheduleDocs = (s: Pick<Schedule, 'docs'>) => (s.docs ?? '').split(',').map((d) => d.trim()).filter(Boolean)

export type Alert = { id: string; date: string; left: number; title: string; kind: string; docs: string[]; note?: string }

/**
 * 종 알림: 알림 기간 안에 들어온 일정. 반복 일정은 각자의 remind_days,
 * 과제 사내 마감·정산 기한은 7일 전부터.
 */
export function upcomingAlerts(
  schedules: Schedule[],
  projects: { id: string; short_name: string; settlement_deadline: string | null; deadline: string | null }[],
  holidays: Set<string>,
  today: string,
  openDocsByProject: Map<string, number>,
): Alert[] {
  const alerts: Alert[] = []
  for (const s of schedules) {
    for (const date of occurrences(s, today, addDays(today, s.remind_days), holidays)) {
      alerts.push({ id: `${s.id}-${date}`, date, left: daysBetween(today, date), title: s.title, kind: s.kind, docs: scheduleDocs(s) })
    }
  }
  for (const p of projects) {
    const open = openDocsByProject.get(p.id) ?? 0
    const deadline = p.deadline
    const note = open ? `아직 안 낸 증빙 ${open}개` : '증빙을 모두 받았어요'
    if (deadline && daysBetween(today, deadline) >= 0 && daysBetween(today, deadline) <= 7) {
      alerts.push({ id: `deadline-${p.id}`, date: deadline, left: daysBetween(today, deadline), title: `${p.short_name} 사내 마감`, kind: '마감', docs: ['미제출 증빙 전체'], note })
    }
    if (p.settlement_deadline && daysBetween(today, p.settlement_deadline) >= 0 && daysBetween(today, p.settlement_deadline) <= 7) {
      alerts.push({ id: `settle-${p.id}`, date: p.settlement_deadline, left: daysBetween(today, p.settlement_deadline), title: `${p.short_name} 정산 기한`, kind: '마감', docs: ['정산 보고서', '증빙 철'], note })
    }
  }
  return alerts.sort((a, b) => a.date.localeCompare(b.date))
}
