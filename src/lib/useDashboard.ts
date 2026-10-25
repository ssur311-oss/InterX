import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'
import { todaySeoul } from './date'
import { internalDeadline, parseHolidays } from './rules/deadline'
import { docState, worstState, STATE_ORDER, type DocState, type StoredStatus } from './rules/docStatus'
import type { RiskCode } from './rules/riskRules'
import type { PayMethod, Person, Project, Setting } from './types'

export type DashDoc = { id: string; doc_type: string; status: StoredStatus; planned_date: string | null; state: DocState }
export type DashRisk = { id: string; rule_code: RiskCode; detail: string | null; resolved: boolean }

export type DashExpense = {
  id: string
  project_id: string
  owner_id: string | null
  category: string
  sub_category: string | null
  pay_method: PayMethod
  amount: number
  paid_at: string
  vendor: string | null
  description: string | null
  no_rule: boolean
  people: { name: string } | null
  required_docs: DashDoc[]
  risk_flags: DashRisk[]
  // 아래는 화면에서 계산한 값
  worst: DocState
  openRisks: number
}

export type ProjectWithDeadline = Project & { deadline: string | null }

const SELECT =
  'id, project_id, owner_id, category, sub_category, pay_method, amount, paid_at, vendor, description, no_rule, ' +
  'people(name), required_docs(id, doc_type, status, planned_date), risk_flags(id, rule_code, detail, resolved)'

export function useDashboard() {
  const [expenses, setExpenses] = useState<DashExpense[]>([])
  const [projects, setProjects] = useState<ProjectWithDeadline[]>([])
  const [people, setPeople] = useState<Person[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const today = todaySeoul()

  const reload = useCallback(async () => {
    if (!supabase) return
    const [ex, pr, pe, st] = await Promise.all([
      supabase.from('expenses').select(SELECT),
      supabase.from('projects').select('*').order('start_date'),
      supabase.from('people').select('*').order('name'),
      supabase.from('settings').select('*'),
    ])
    const err = ex.error ?? pr.error ?? pe.error ?? st.error
    if (err) {
      setError(err.message)
      setLoading(false)
      return
    }

    const holidays = parseHolidays((st.data ?? []) as Setting[])
    const projectList = ((pr.data ?? []) as Project[]).map((p) => ({ ...p, deadline: internalDeadline(p, holidays) }))
    const deadlineOf = new Map(projectList.map((p) => [p.id, p.deadline]))

    const rows = ((ex.data ?? []) as unknown as Omit<DashExpense, 'worst' | 'openRisks'>[]).map((e) => {
      const docs = e.required_docs.map((d) => ({ ...d, state: docState(d, today, deadlineOf.get(e.project_id) ?? null) }))
      return {
        ...e,
        required_docs: docs.sort((a, b) => STATE_ORDER.indexOf(a.state) - STATE_ORDER.indexOf(b.state)),
        worst: worstState(docs.map((d) => d.state)),
        openRisks: e.risk_flags.filter((f) => !f.resolved).length,
      }
    })

    // 🔴 → ⚠️ → ❌ → ⏳ → ✅, 같은 상태면 위험 확인 필요 건 먼저, 그다음 최근 집행 순
    rows.sort(
      (a, b) =>
        STATE_ORDER.indexOf(a.worst) - STATE_ORDER.indexOf(b.worst) ||
        Number(b.openRisks > 0) - Number(a.openRisks > 0) ||
        b.paid_at.localeCompare(a.paid_at),
    )

    setExpenses(rows)
    setProjects(projectList)
    setPeople((pe.data ?? []) as Person[])
    setError(null)
    setLoading(false)
  }, [today])

  useEffect(() => {
    reload()
  }, [reload])

  return { expenses, projects, people, today, error, loading, reload }
}
