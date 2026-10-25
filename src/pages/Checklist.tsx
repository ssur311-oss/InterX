import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Archive, Download, ListChecks, PartyPopper, Search } from 'lucide-react'
import { CompletedBox } from '../components/checklist/CompletedBox'
import { DateSections, type DateSection } from '../components/checklist/DateSections'
import { Filters } from '../components/dashboard/Filters'
import { Toast } from '../components/Toast'
import { BTN, BTN_PRIMARY, Empty, PageHeader, Workspace } from '../components/ui'
import { applyFilter, countViews, EMPTY_FILTER, VIEW_LABEL, type Filter, type SummaryView, type View } from '../lib/dashboardFilter'
import { seoulParts } from '../lib/date'
import { isComplete } from '../lib/docCheck'
import { exportCompleted } from '../lib/exportCompleted'
import { useDashboard } from '../lib/useDashboard'
import { useDocToggle } from '../lib/useDocToggle'

const VIEWS: View[] = ['all', 'overdue', 'today', 'over_deadline']

export default function Checklist() {
  const { expenses, projects, people, today, error, loading, reload, patchDoc } = useDashboard()
  const [params] = useSearchParams()
  const initialView = params.get('view') as View | null
  const [filter, setFilter] = useState<Filter>({ ...EMPTY_FILTER, view: initialView && VIEWS.includes(initialView) ? initialView : 'all' })
  const [box, setBox] = useState<'pending' | 'done'>('pending')
  const [query, setQuery] = useState('')

  const { toggle, leaving, toast, closeToast } = useDocToggle(patchDoc, reload)

  const searched = useMemo(
    () => (query.trim() ? expenses.filter((e) => `${e.description ?? ''} ${e.vendor ?? ''}`.includes(query.trim())) : expenses),
    [expenses, query],
  )
  const scoped = applyFilter(searched, { ...filter, view: 'all' }, today)
  const pendingAll = scoped.filter((e) => !isComplete(e) || leaving.has(e.id))
  const done = scoped.filter((e) => isComplete(e) && !leaving.has(e.id))
  const counts = countViews(pendingAll, today)
  const pending = applyFilter(pendingAll, { ...filter, projectId: '', personId: '' }, today)
  const projectName = (id: string) => projects.find((p) => p.id === id)?.short_name ?? ''

  const map = new Map<string, typeof pending>()
  // 날짜 구간 = 엑셀로 등록한 날(나한테 들어온 날). 최근 날짜가 위, 구간 안에서는 급한 건이 위
  for (const e of pending) {
    const date = seoulParts(e.created_at).date
    map.set(date, [...(map.get(date) ?? []), e])
  }
  const sections: DateSection[] = [...map.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, list]) => ({ date, isToday: date === today, expenses: list }))

  if (loading) return <Workspace><p className="text-body">불러오는 중…</p></Workspace>
  if (error) return <Workspace><p className="text-danger">데이터를 불러오지 못했어요: {error}. 새로고침해 주세요.</p></Workspace>

  const tabBtn = (key: 'pending' | 'done', label: string, n: number, Icon: typeof Archive) => (
    <button onClick={() => setBox(key)} aria-pressed={box === key}
      className={`flex min-h-12 items-center gap-2 rounded-xl px-5 font-semibold ${box === key ? 'bg-white text-ink shadow-sm' : 'text-body hover:bg-white/50'}`}>
      <Icon aria-hidden size={18} className={box === key ? 'text-brand' : ''} />
      {label}
      <span className={`rounded-full px-2 text-[13px] ${box === key ? 'bg-brand-soft text-brand' : 'bg-white/60'}`}>{n}</span>
    </button>
  )

  return (
    <Workspace>
      <PageHeader
        title="증빙 체크리스트"
        desc="받은 서류를 체크하세요. 한 건의 서류를 모두 체크하면 그 건은 완료함으로 옮겨져요."
        action={<Link to="/upload" className={BTN}>엑셀로 집행 건 추가</Link>}
      />

      <div className="glass mb-6 inline-flex gap-1 rounded-2xl p-1">
        {tabBtn('pending', '처리 중', pendingAll.length, ListChecks)}
        {tabBtn('done', '완료함', done.length, Archive)}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <label className="relative">
          <span className="sr-only">거래처·내용 검색</span>
          <Search aria-hidden size={18} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-body" />
          <input value={query} onChange={(ev) => setQuery(ev.target.value)} placeholder="거래처·내용 검색"
            className="min-h-11 w-56 rounded-lg border border-white/90 bg-white/70 pr-3 pl-10 shadow-sm focus:border-brand" />
        </label>
        <Filters filter={filter} projects={projects} people={people} onChange={setFilter} />
      </div>

      {box === 'pending' && (
        <>
          <div className="mb-8 flex flex-wrap gap-2" role="group" aria-label="상태로 좁히기">
            {VIEWS.map((view) => (
              <button key={view} onClick={() => setFilter({ ...filter, view })} aria-pressed={filter.view === view}
                className={`min-h-11 rounded-full px-4 text-[15px] ${
                  filter.view === view ? 'bg-ink font-semibold text-white' : 'glass text-body hover:text-ink'
                }`}>
                {view === 'all' ? '전체' : VIEW_LABEL[view]}
                {view !== 'all' && <span className="ml-1 tabular-nums opacity-80">{counts[view as SummaryView]}</span>}
              </button>
            ))}
          </div>

          {pending.length === 0 ? (
            expenses.length === 0 ? (
              <Empty icon={<ListChecks size={40} />} title="체크할 서류가 아직 없어요"
                desc="집행 내역 엑셀을 올리면 건마다 필요한 서류가 체크리스트로 만들어져요."
                action={<Link to="/upload" className={BTN_PRIMARY}>엑셀 올리기</Link>} />
            ) : pendingAll.length === 0 ? (
              <Empty icon={<PartyPopper size={40} />} title="처리할 건이 없어요"
                desc="이 조건의 집행 건은 서류가 모두 모였어요. 완료함에서 한꺼번에 볼 수 있어요."
                action={<button className={BTN} onClick={() => setBox('done')}>완료함 보기</button>} />
            ) : (
              <Empty icon={<Search size={40} />} title="조건에 맞는 건이 없어요"
                desc="상태·과제·사람·검색 조건을 넓혀 보세요."
                action={<button className={BTN} onClick={() => { setFilter(EMPTY_FILTER); setQuery('') }}>조건 모두 지우기</button>} />
            )
          ) : (
            // 조건이 바뀌면 처음 구간부터 다시 보여준다
            <DateSections key={`${filter.view}|${filter.projectId}|${filter.personId}|${query}`}
              sections={sections} today={today} projectName={projectName} leaving={leaving} onToggle={toggle} />
          )}
        </>
      )}

      {box === 'done' &&
        (done.length === 0 ? (
          <Empty icon={<Archive size={40} />} title="완료함이 비어 있어요"
            desc="'처리 중'에서 한 건의 서류를 모두 체크하면 여기에 과제별로 모여요."
            action={<button className={BTN} onClick={() => setBox('pending')}>처리 중 보기</button>} />
        ) : (
          <>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <p className="text-body">
                완료 <b className="text-ink">{done.length}건</b> · 위 검색·과제·사람 조건이 그대로 적용돼요.
              </p>
              <button onClick={() => exportCompleted(done, projects, today)} className={BTN}>
                <Download aria-hidden size={18} /> 엑셀로 내보내기
              </button>
            </div>
            <CompletedBox expenses={done} projects={projects} onToggle={toggle} />
          </>
        ))}

      <Toast toast={toast} onClose={closeToast} />
    </Workspace>
  )
}
