import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Filters } from '../components/dashboard/Filters'
import { TodaySummary } from '../components/dashboard/TodaySummary'
import { ExpenseRow } from '../components/ExpenseRow'
import { ResolveRiskDialog } from '../components/ResolveRiskDialog'
import { applyFilter, countViews, EMPTY_FILTER, type Filter } from '../lib/dashboardFilter'
import { formatDate } from '../lib/format'
import { useDashboard, type DashExpense, type DashRisk } from '../lib/useDashboard'

export default function Dashboard() {
  const { expenses, projects, people, today, error, loading, reload } = useDashboard()
  const [filter, setFilter] = useState<Filter>(EMPTY_FILTER)
  const [resolving, setResolving] = useState<{ expense: DashExpense; risk: DashRisk } | null>(null)

  // 카드 숫자는 과제·사람 필터를 반영하되, 카드 선택(view)과는 무관하게 센다
  const scoped = useMemo(() => applyFilter(expenses, { ...filter, view: 'all' }, today), [expenses, filter, today])
  const counts = useMemo(() => countViews(scoped, today), [scoped, today])
  const visible = useMemo(() => applyFilter(expenses, filter, today), [expenses, filter, today])
  const projectName = (id: string) => projects.find((p) => p.id === id)?.short_name ?? ''

  if (loading) return <p className="p-6 text-gray-500">불러오는 중…</p>
  if (error) return <p className="p-6 text-red-700">데이터를 불러오지 못했어요: {error}</p>

  return (
    <main className="mx-auto max-w-6xl p-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">증빙 현황판</h1>
          <p className="mt-1 text-sm text-gray-600">오늘 {formatDate(today)} 기준</p>
        </div>
        <p className="text-sm text-gray-600">
          사내 마감{' '}
          {projects.map((p, i) => (
            <span key={p.id}>
              {i > 0 && ' · '}
              {p.short_name} <b>{p.deadline ? formatDate(p.deadline) : '정산 기한 미입력'}</b>
            </span>
          ))}
        </p>
      </div>

      <h2 className="mt-6 mb-2 font-semibold">오늘 처리할 것</h2>
      <TodaySummary counts={counts} active={filter.view} onSelect={(view) => setFilter({ ...filter, view })} />

      <div className="mt-8 mb-2 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold">집행 건 {visible.length}건</h2>
        <Filters filter={filter} projects={projects} people={people} onChange={setFilter} />
      </div>

      {visible.length === 0 ? (
        <div className="rounded border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-600">
          {expenses.length === 0 ? (
            <>아직 집행 건이 없어요. <Link to="/upload" className="text-blue-700 underline">엑셀 업로드</Link>로 시작하세요.</>
          ) : (
            '조건에 맞는 집행 건이 없어요. 🎉'
          )}
        </div>
      ) : (
        <div className="overflow-x-auto rounded border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-600">
              <tr>
                <th className="px-3 py-2">집행일</th>
                <th className="px-3 py-2">과제 / 비목</th>
                <th className="px-3 py-2">내용 · 위험</th>
                <th className="px-3 py-2 text-right">금액</th>
                <th className="px-3 py-2">사용자</th>
                <th className="px-3 py-2">증빙</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((e) => (
                <ExpenseRow key={e.id} expense={e} projectName={projectName(e.project_id)}
                  onResolve={(risk) => setResolving({ expense: e, risk })} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-3 text-xs text-gray-500">
        🔴 약속일 경과 · ⚠️ 마감 넘는 예정 · ❌ 미제출 · ⏳ 제출 예정 · ✅ 제출 — 위험 태그를 누르면 소명 처리할 수 있어요.
      </p>

      {resolving && (
        <ResolveRiskDialog
          expenseId={resolving.expense.id}
          expenseLabel={`${formatDate(resolving.expense.paid_at)} ${resolving.expense.description ?? ''}`}
          risk={resolving.risk}
          onClose={() => setResolving(null)}
          onDone={() => {
            setResolving(null)
            reload()
          }}
        />
      )}
    </main>
  )
}
