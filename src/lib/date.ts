// 날짜·시각은 모두 Asia/Seoul 기준으로 계산한다 (RULE.md 8장)
const MINUTE_MS = 60_000
const DAY_MS = 86_400_000
const SEOUL_OFFSET_MS = 9 * 3_600_000

const pad = (n: number) => String(n).padStart(2, '0')

export type SeoulParts = { date: string; hour: number; minute: number; weekday: number }

/** DB 일시(UTC로 올 수 있음) → 서울 기준 날짜·시·분·요일(0=일) */
export function seoulParts(iso: string): SeoulParts {
  const d = new Date(new Date(iso).getTime() + SEOUL_OFFSET_MS)
  return {
    date: `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`,
    hour: d.getUTCHours(),
    minute: d.getUTCMinutes(),
    weekday: d.getUTCDay(),
  }
}

/** 'YYYY-MM-DD'의 요일 (0=일) */
export function weekdayOf(date: string): number {
  return new Date(`${date}T00:00:00Z`).getUTCDay()
}

/** 서울 기준 오늘 'YYYY-MM-DD' */
export function todaySeoul(): string {
  return seoulParts(new Date().toISOString()).date
}

/** from에서 to까지 며칠 남았는지 ('YYYY-MM-DD' 기준, 지났으면 음수) */
export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS)
}

/** 'YYYY-MM-DD'에 n일 더하기 (음수면 빼기) */
export function addDays(date: string, n: number): string {
  return new Date(new Date(`${date}T00:00:00Z`).getTime() + n * DAY_MS).toISOString().slice(0, 10)
}

function toIso(y: number, mo: number, d: number, h: number, mi: number): string | null {
  const t = new Date(Date.UTC(y, mo - 1, d, h, mi))
  // 2월 30일 같은 없는 날짜를 걸러낸다
  if (t.getUTCMonth() !== mo - 1 || t.getUTCDate() !== d || h > 23 || mi > 59) return null
  return `${y}-${pad(mo)}-${pad(d)}T${pad(h)}:${pad(mi)}:00+09:00`
}

/** 엑셀 칸 값(날짜 일련번호 또는 '2026-10-14 14:05' 같은 글자) → 서울 기준 ISO 일시. 못 읽으면 null */
export function parseDateTimeCell(value: unknown): string | null {
  if (typeof value === 'number' && value > 0) {
    // 엑셀 날짜 일련번호 = 1899-12-30부터 지난 일수, 소수점 아래는 시각
    const d = new Date(Date.UTC(1899, 11, 30) + Math.round((value * DAY_MS) / MINUTE_MS) * MINUTE_MS)
    return toIso(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate(), d.getUTCHours(), d.getUTCMinutes())
  }
  if (typeof value !== 'string') return null
  const m = value.trim().match(/^(\d{4})\s*[-./]\s*(\d{1,2})\s*[-./]\s*(\d{1,2})\.?(?:\s+(\d{1,2}):(\d{2}))?/)
  if (!m) return null
  return toIso(Number(m[1]), Number(m[2]), Number(m[3]), Number(m[4] ?? 0), Number(m[5] ?? 0))
}
