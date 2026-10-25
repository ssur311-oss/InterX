import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from './supabase'
import { todaySeoul } from './date'
import { internalDeadline, parseHolidays } from './rules/deadline'
import { docState, worstState, STATE_ORDER, type DocState, type StoredStatus } from './rules/docStatus'
import type { RiskCode } from './rules/riskRules'
import type { BudgetItem, PayMethod, Person, Project, Setting } from './types'

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
  created_at: string // 엑셀로 등록한 일시 = 나한테 들어온 날
  no_rule: boolean
  people: { name: string } | null
  required_docs: DashDoc[]
  risk_flags: DashRisk[]
  // 아래는 화면에서 계산한 값
  worst: DocState
  openRisks: number
}

type RawExpense = Omit<DashExpense, 'worst' | 'openRisks' | 'required_docs'> & {
  required_docs: Omit<DashDoc, 'state'>[]
}

export type ProjectWithDeadline = Project & { deadline: string | null }

const SELECT =
  'id, project_id, owner_id, category, sub_category, pay_method, amount, paid_at, vendor, description, created_at, no_rule, ' +
  'people(name), required_docs(id, doc_type, status, planned_date), risk_flags(id, rule_code, detail, resolved)'

/** 저장된 값에서 화면용 상태를 계산한다. '약속일 경과'·'마감 넘는 예정'은 저장하지 않고 매번 계산 (RULE.md 4장) */
function derive(raw: RawExpense[], today: string, deadlineOf: Map<string, string | null>): DashExpense[] {
  return raw.map((e) => {
    const docs = e.required_docs.map((d) => ({ ...d, state: docState(d, today, deadlineOf.get(e.project_id) ?? null) }))
    return {
      ...e,
      required_docs: docs,
      worst: worstState(docs.map((d) => d.state)),
      openRisks: e.risk_flags.filter((f) => !f.resolved).length,
    }
  })
}

/**
 * 🔴 → ⚠️ → ❌ → ⏳ → ✅, 같은 상태면 위험 확인 필요 건 먼저, 그다음 최근 집행 순.
 * 서버에서 읽을 때만 정렬한다. 체크할 때마다 다시 정렬하면 누르던 카드가 다른 자리로 튀기 때문.
 */
function sortForDisplay(rows: DashExpense[]): DashExpense[] {
  const byState = (a: DashDoc, b: DashDoc) => STATE_ORDER.indexOf(a.state) - STATE_ORDER.indexOf(b.state)
  return rows
    .map((e) => ({ ...e, required_docs: [...e.required_docs].sort(byState) }))
    .sort(
      (a, b) =>
        STATE_ORDER.indexOf(a.worst) - STATE_ORDER.indexOf(b.worst) ||
        Number(b.openRisks > 0) - Number(a.openRisks > 0) ||
        b.paid_at.localeCompare(a.paid_at),
    )
}

export function useDashboard() {
  const [raw, setRaw] = useState<RawExpense[]>([])
  const [projects, setProjects] = useState<ProjectWithDeadline[]>([])
  const [people, setPeople] = useState<Person[]>([])
  const [settings, setSettings] = useState<Setting[]>([])
  const [budget, setBudget] = useState<BudgetItem[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const today = todaySeoul()

  const reload = useCallback(async () => {
    if (!supabase) return
    const [ex, pr, pe, st, bu] = await Promise.all([
      supabase.from('expenses').select(SELECT),
      supabase.from('projects').select('*').order('start_date'),
      supabase.from('people').select('*').order('name'),
      supabase.from('settings').select('*'),
      supabase.from('budget_items').select('*'),
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
    setProjects(projectList)
    setRaw(sortForDisplay(derive((ex.data ?? []) as unknown as RawExpense[], today, deadlineOf)))
    setPeople((pe.data ?? []) as Person[])
    setSettings((st.data ?? []) as Setting[])
    // 예산은 여유 기능이라 못 읽어도 나머지 화면은 그대로 보여준다
    setBudget(bu.error ? [] : ((bu.data ?? []) as BudgetItem[]))
    setError(null)
    setLoading(false)
  }, [today])

  useEffect(() => {
    reload()
  }, [reload])

  const expenses = useMemo(
    () => derive(raw, today, new Map(projects.map((p) => [p.id, p.deadline]))),
    [raw, today, projects],
  )

  /** 체크 결과를 서버 응답 전에 화면에 먼저 반영한다 (실패하면 reload로 되돌림) */
  const patchDoc = useCallback((docId: string, status: StoredStatus) => {
    setRaw((rows) =>
      rows.map((e) =>
        e.required_docs.some((d) => d.id === docId)
          ? { ...e, required_docs: e.required_docs.map((d) => (d.id === docId ? { ...d, status } : d)) }
          : e,
      ),
    )
  }, [])

  return { expenses, projects, people, settings, budget, today, error, loading, reload, patchDoc }
}
