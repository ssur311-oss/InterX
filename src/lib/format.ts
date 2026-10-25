import { seoulParts, weekdayOf } from './date'

// 표기 규칙: RULE.md 8장
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

/** 2300000 → "2,300,000원" */
export function formatWon(amount: number): string {
  return `${amount.toLocaleString('ko-KR')}원`
}

/** "2026-11-03" 또는 ISO 일시 → "11/3(화)" (Asia/Seoul 기준) */
export function formatDate(value: string): string {
  const date = value.length === 10 ? value : seoulParts(value).date
  const [, m, d] = date.split('-').map(Number)
  return `${m}/${d}(${WEEKDAYS[weekdayOf(date)]})`
}

/** ISO 일시 → "14:05" (Asia/Seoul 기준) */
export function formatTime(value: string): string {
  const { hour, minute } = seoulParts(value)
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}
