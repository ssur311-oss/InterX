import { supabase } from '../supabase'
import { computeRiskFlags, riskConfigFromSettings, type RiskInput } from '../rules/riskRules'
import type { DocRule, Person, Project, Setting } from '../types'
import type { ExistingExpense, NewExpense } from './parseRows'

export type UploadContext = {
  projects: Project[]
  people: Person[]
  rules: DocRule[]
  settings: Setting[]
  existing: ExistingExpense[]
}

function db() {
  if (!supabase) throw new Error('Supabase 연결 정보가 없어요')
  return supabase
}

async function must<T>(query: PromiseLike<{ data: T | null; error: { message: string } | null }>): Promise<T> {
  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data as T
}

/** 업로드 화면에서 필요한 설정·기존 집행 건을 한 번에 읽는다 */
export async function loadUploadContext(): Promise<UploadContext> {
  const s = db()
  const [projects, people, rules, settings, existing] = await Promise.all([
    must<Project[]>(s.from('projects').select('*')),
    must<Person[]>(s.from('people').select('*')),
    must<DocRule[]>(s.from('doc_rules').select('*')),
    must<Setting[]>(s.from('settings').select('*')),
    must<ExistingExpense[]>(s.from('expenses').select('id, project_id, paid_at, amount, vendor')),
  ])
  return { projects, people, rules, settings, existing }
}

export type RegisterItem = { expense: NewExpense; docs: string[]; noRule: boolean }

/** 관리자가 [등록]을 눌렀을 때만 호출: 집행 건 → 필요 증빙 → 처리 이력 순으로 저장 */
export async function registerExpenses(items: RegisterItem[], fileName: string, via = '엑셀 업로드'): Promise<void> {
  const s = db()
  await must(s.from('expenses').insert(items.map((i) => ({ ...i.expense, no_rule: i.noRule }))))
  await must(
    s.from('required_docs').insert(
      items.flatMap((i) => i.docs.map((doc_type) => ({ expense_id: i.expense.id, doc_type, status: 'missing' }))),
    ),
  )
  await must(
    s.from('activity_log').insert(
      items.map((i) => ({
        expense_id: i.expense.id,
        kind: 'memo',
        content: `${via}로 등록 (${fileName})${i.noRule ? ' — 규칙 없음, 결제 증빙만 생성' : ''}`,
        source: 'system',
      })),
    ),
  )
}

/**
 * 전체 집행 건의 위험 표시를 다시 계산해서 없는 것만 추가한다.
 * 이미 있는 표시(소명 완료 포함)는 건드리지 않는다. 반환값 = 새로 추가된 개수
 */
export async function syncRiskFlags(): Promise<number> {
  const s = db()
  const [expenses, projects, settings] = await Promise.all([
    must<RiskInput[]>(s.from('expenses').select('id, project_id, paid_at, amount, vendor')),
    must<Project[]>(s.from('projects').select('*')),
    must<Setting[]>(s.from('settings').select('*')),
  ])
  const flags = computeRiskFlags(expenses, projects, riskConfigFromSettings(settings))
  if (!flags.length) return 0
  const added = await must<{ id: string }[]>(
    s.from('risk_flags').upsert(flags, { onConflict: 'expense_id,rule_code', ignoreDuplicates: true }).select('id'),
  )
  return added.length
}
