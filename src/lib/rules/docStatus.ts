// 증빙 상태 판정 (RULE.md 4장). '약속일 경과'와 '마감 넘는 예정'은 저장하지 않고 볼 때마다 계산한다.
export type StoredStatus = 'submitted' | 'scheduled' | 'missing'
export type DocState = 'overdue' | 'over_deadline' | 'missing' | 'scheduled' | 'submitted'

/** 현황판 정렬 순서: 🔴 → ⚠️ → ❌ → ⏳ → ✅ */
export const STATE_ORDER: DocState[] = ['overdue', 'over_deadline', 'missing', 'scheduled', 'submitted']

export const STATE_ICON: Record<DocState, string> = {
  overdue: '🔴',
  over_deadline: '⚠️',
  missing: '❌',
  scheduled: '⏳',
  submitted: '✅',
}

export const STATE_LABEL: Record<DocState, string> = {
  overdue: '약속일 경과',
  over_deadline: '변동 사항', // 사내 마감을 넘는 예정일. 화면 이름만 '변동 사항'으로 부른다
  missing: '미제출',
  scheduled: '제출 예정',
  submitted: '제출',
}

export function docState(
  doc: { status: StoredStatus; planned_date: string | null },
  today: string,
  internalDeadline: string | null,
): DocState {
  if (doc.status !== 'scheduled') return doc.status
  if (!doc.planned_date) return 'scheduled'
  if (today > doc.planned_date) return 'overdue'
  if (internalDeadline && doc.planned_date > internalDeadline) return 'over_deadline'
  return 'scheduled'
}

/** 여러 증빙 중 가장 급한 상태 (증빙이 없으면 제출로 본다) */
export function worstState(states: DocState[]): DocState {
  return STATE_ORDER.find((s) => states.includes(s)) ?? 'submitted'
}
