import type { BudgetItem } from './types'
import type { DashExpense } from './useDashboard'

export type BudgetRow = { key: string; label: string; planned: number; spent: number; rate: number }

const row = (key: string, label: string, planned: number, spent: number): BudgetRow =>
  ({ key, label, planned, spent, rate: planned ? (spent / planned) * 100 : 0 })

/** 예산(계획액)은 budget_items, 집행액은 등록된 집행 건 금액을 코드가 합산한다 */
export function budgetByCategory(budget: BudgetItem[], expenses: DashExpense[], projectId = ''): BudgetRow[] {
  const b = budget.filter((x) => !projectId || x.project_id === projectId)
  const e = expenses.filter((x) => !projectId || x.project_id === projectId)
  return [...new Set(b.map((x) => x.category))].map((c) =>
    row(c, c, b.filter((x) => x.category === c).reduce((n, x) => n + x.planned_amount, 0),
      e.filter((x) => x.category === c).reduce((n, x) => n + x.amount, 0)))
}

export function budgetByProject(budget: BudgetItem[], expenses: DashExpense[], projects: { id: string; short_name: string }[]): BudgetRow[] {
  return projects.map((p) =>
    row(p.id, p.short_name, budget.filter((x) => x.project_id === p.id).reduce((n, x) => n + x.planned_amount, 0),
      expenses.filter((x) => x.project_id === p.id).reduce((n, x) => n + x.amount, 0)))
}

export function budgetTotal(rows: BudgetRow[]): BudgetRow {
  return row('total', '전체', rows.reduce((n, r) => n + r.planned, 0), rows.reduce((n, r) => n + r.spent, 0))
}
