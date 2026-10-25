import { daysBetween } from './date'
import { formatDate } from './format'
import { invokeFunction } from './invokeFunction'
import { STATE_LABEL } from './rules/docStatus'
import type { DashExpense, ProjectWithDeadline } from './useDashboard'

// 통보 문장 AI 다듬기 (SKILL.md 작업 2). 남은 서류·마감·남은 일수·회차는 코드가 계산해서 넘긴다
export function openExpensesOf(personId: string, expenses: DashExpense[]) {
  return expenses.filter((e) => e.owner_id === personId && e.required_docs.some((d) => d.status !== 'submitted'))
}

export async function draftNotice(opts: {
  name: string
  mine: DashExpense[]
  projects: ProjectWithDeadline[]
  today: string
  round: number
  draft?: string
}) {
  const related = opts.projects.filter((p) => opts.mine.some((e) => e.project_id === p.id))
  const deadline = related.map((p) => p.deadline).filter((d): d is string => Boolean(d)).sort()[0] ?? null
  const res = await invokeFunction<{ text: string }>('ai-assist', {
    task: 'notice',
    recipient: opts.name,
    projects: related.map((p) => p.name),
    items: opts.mine.map((e) => ({
      date: formatDate(e.paid_at),
      what: e.description ?? '',
      docs: e.required_docs
        .filter((d) => d.status !== 'submitted')
        .map((d) => ({ type: d.doc_type, state: STATE_LABEL[d.state], planned: d.planned_date ? formatDate(d.planned_date) : null })),
    })),
    deadline: deadline ? formatDate(deadline) : null,
    daysLeft: deadline ? daysBetween(opts.today, deadline) : null,
    round: opts.round,
    ...(opts.draft?.trim() ? { draft: opts.draft } : {}),
  }, 'AI 문장 쓰기')
  return res.text
}
