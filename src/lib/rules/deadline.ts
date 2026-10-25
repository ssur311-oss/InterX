import { addDays, weekdayOf } from '../date'
import type { Project, Setting } from '../types'

// 마감 일정 계산 (RULE.md 3장)

/** settings의 holidays 값 → 공휴일 집합 */
export function parseHolidays(settings: Pick<Setting, 'key' | 'value'>[]): Set<string> {
  const value = settings.find((s) => s.key === 'holidays')?.value ?? ''
  return new Set(value.split(',').map((d) => d.trim()).filter(Boolean))
}

export function isBusinessDay(date: string, holidays: Set<string>): boolean {
  const w = weekdayOf(date)
  return w !== 0 && w !== 6 && !holidays.has(date)
}

/** 주말·공휴일이면 직전 영업일로 당긴다 */
export function businessDayOnOrBefore(date: string, holidays: Set<string>): string {
  let d = date
  while (!isBusinessDay(d, holidays)) d = addDays(d, -1)
  return d
}

/** 영업일 기준으로 n일 앞 날짜 */
export function subtractBusinessDays(date: string, n: number, holidays: Set<string>): string {
  let d = date
  let left = n
  while (left > 0) {
    d = addDays(d, -1)
    if (isBusinessDay(d, holidays)) left--
  }
  return businessDayOnOrBefore(d, holidays)
}

/** settings의 remind_days 값('7,3,1') → [7, 3, 1] */
export function parseRemindDays(settings: Pick<Setting, 'key' | 'value'>[]): number[] {
  const value = settings.find((s) => s.key === 'remind_days')?.value ?? '7,3,1'
  return value.split(',').map((d) => Number(d.trim())).filter((n) => Number.isInteger(n) && n > 0)
}

/**
 * 리마인드일: 사내 마감 D-7, D-3, D-1 (달력 기준). 주말·공휴일이면 직전 영업일로 당긴다.
 * 당긴 결과가 같은 날이면 하나로 합친다.
 */
export function reminderDates(deadline: string, days: number[], holidays: Set<string>): { date: string; label: string }[] {
  const byDate = new Map<string, string[]>()
  for (const n of [...days].sort((a, b) => b - a)) {
    const date = businessDayOnOrBefore(addDays(deadline, -n), holidays)
    byDate.set(date, [...(byDate.get(date) ?? []), `D-${n}`])
  }
  return [...byDate].map(([date, labels]) => ({ date, label: labels.join('·') }))
}

/** 사내 마감일 = 정산 기한 − 사내 마감 여유일(영업일). 정산 기한이 없으면 null */
export function internalDeadline(
  project: Pick<Project, 'settlement_deadline' | 'internal_buffer_days'>,
  holidays: Set<string>,
): string | null {
  if (!project.settlement_deadline) return null
  return subtractBusinessDays(project.settlement_deadline, project.internal_buffer_days, holidays)
}
