import type { DashExpense } from './useDashboard'

export type View = 'all' | 'overdue' | 'today' | 'over_deadline' | 'missing' | 'risk'

export type Filter = { view: View; projectId: string; personId: string }

export const EMPTY_FILTER: Filter = { view: 'all', projectId: '', personId: '' }

function matchesView(e: DashExpense, view: View, today: string): boolean {
  switch (view) {
    case 'all':
      return true
    case 'today':
      return e.required_docs.some((d) => d.status === 'scheduled' && d.planned_date === today)
    case 'risk':
      return e.openRisks > 0 || e.no_rule
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

/** "오늘 처리할 것" 카드 숫자. 증빙은 개수, 위험은 집행 건수 */
export function countViews(expenses: DashExpense[], today: string): Record<Exclude<View, 'all'>, number> {
  const docs = expenses.flatMap((e) => e.required_docs)
  return {
    overdue: docs.filter((d) => d.state === 'overdue').length,
    today: docs.filter((d) => d.status === 'scheduled' && d.planned_date === today).length,
    over_deadline: docs.filter((d) => d.state === 'over_deadline').length,
    missing: docs.filter((d) => d.state === 'missing').length,
    risk: expenses.filter((e) => e.openRisks > 0 || e.no_rule).length,
  }
}
