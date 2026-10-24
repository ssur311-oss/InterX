// 표기 규칙: RULE.md 8장
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

/** 2300000 → "2,300,000원" */
export function formatWon(amount: number): string {
  return `${amount.toLocaleString('ko-KR')}원`
}

/** "2026-11-03" 또는 ISO 일시 → "11/3(화)" (Asia/Seoul 기준) */
export function formatDate(value: string): string {
  const d = new Date(value.length === 10 ? `${value}T00:00:00+09:00` : value)
  const seoul = new Date(d.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }))
  return `${seoul.getMonth() + 1}/${seoul.getDate()}(${WEEKDAYS[seoul.getDay()]})`
}
