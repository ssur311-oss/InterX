import type { DashExpense } from './useDashboard'

// 위험 확인 필요는 AI 기능을 붙일 때 다시 넣는다
export type View = 'all' | 'overdue' | 'today' | 'over_deadline'
export type SummaryView = Exclude<View, 'all'>

export type Filter = { view: View; projectId: string; personId: string }

export const EMPTY_FILTER: Filter = { view: 'all', projectId: '', personId: '' }

export const VIEW_LABEL: Record<SummaryView, string> = {
  overdue: '약속일 경과',
  today: '오늘 제출 예정',
  over_deadline: '변동 사항',
}

function matchesView(e: DashExpense, view: View, today: string): boolean {
  switch (view) {
    case 'all':
      return true
    case 'today':
      return e.required_docs.some((d) => d.status === 'scheduled' && d.planned_date === today)
    default:
      return e.required_docs.some((d) => d.state === view)
  }
}

export function applyFilter(expenses: DashExpense[], f: Filter, today: string): DashExpense[] {
  return expenses.filter(
    (e) =>
      (!f.projectId || e.project_id === f.projectId) &&
      (!f.personId || e.owner_id === f.personId) &&
      matchesView(e, f.view, today),
  )
}

/** 요약 카드 숫자 (서류 개수) */
export function countViews(expenses: DashExpense[], today: string): Record<SummaryView, number> {
  const docs = expenses.flatMap((e) => e.required_docs)
  return {
    overdue: docs.filter((d) => d.state === 'overdue').length,
    today: docs.filter((d) => d.status === 'scheduled' && d.planned_date === today).length,
    over_deadline: docs.filter((d) => d.state === 'over_deadline').length,
  }
}
