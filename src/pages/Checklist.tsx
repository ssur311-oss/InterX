import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Archive, Download, FolderArchive, ListChecks, PartyPopper, Search } from 'lucide-react'
import { CompletedBox } from '../components/checklist/CompletedBox'
import { FilesBox } from '../components/checklist/FilesBox'
import { DateSections, type DateSection } from '../components/checklist/DateSections'
import { Filters } from '../components/dashboard/Filters'
import { Toast } from '../components/Toast'
import { BTN, BTN_PRIMARY, Empty, PageHeader, Workspace } from '../components/ui'
import { applyFilter, countViews, EMPTY_FILTER, VIEW_LABEL, type Filter, type SummaryView, type View } from '../lib/dashboardFilter'
import { seoulParts } from '../lib/date'
import { addRequiredDoc, isComplete } from '../lib/docCheck'
import { attachFile, openFile } from '../lib/evidenceFile'
import { exportCompleted } from '../lib/exportCompleted'
import { useDashboard, type DashDoc, type DashExpense } from '../lib/useDashboard'
import { useDocToggle } from '../lib/useDocToggle'

const VIEWS: View[] = ['all', 'overdue', 'today', 'over_deadline']
// 처리 중 / 완료함 / 파일 보관함(F8)
type Box = 'pending' | 'done' | 'files'

export default function Checklist() {
  const { expenses, projects, people, today, error, loading, reload, patchDoc, patchDocFile, appendDoc } = useDashboard()
  const [params] = useSearchParams()
  const initialView = params.get('view') as View | null
  const [filter, setFilter] = useState<Filter>({ ...EMPTY_FILTER, view: initialView && VIEWS.includes(initialView) ? initialView : 'all' })
  const [box, setBox] = useState<Box>('pending')
  const [query, setQuery] = useState('')

  const { toggle, leaving, toast, closeToast, say } = useDocToggle(patchDoc, reload)

  // 서류 칸에 파일을 올리면 보관함에 저장 + 표준 이름. 제출 체크는 관리자에게 묻는다 (RULE.md 7장)
  async function onFile(e: DashExpense, d: DashDoc, file: File) {
    try {
      const short = projects.find((p) => p.id === e.project_id)?.short_name ?? ''
      const { path, name } = await attachFile(file, { expenseId: e.id, projectShort: short, category: e.category, paidAt: e.paid_at, amount: e.amount, vendor: e.vendor }, d)
      patchDocFile(d.id, path, name)
      if (d.status !== 'submitted') say(`파일을 보관했어요 (${name}). 제출로 체크할까요?`, { action: { label: '제출로 체크', run: () => toggle(e, d, true) } })
      else say(`파일을 보관했어요 (${name}).`)
    } catch (err) {
      say((err as Error).message, { tone: 'error' })
    }
  }
  // 규칙표에 없는 서류를 직접 추가. 완료함에 있던 건이면 다시 처리 중으로 돌아간다
  async function onAddDoc(e: DashExpense, name: string) {
    try {
      const id = await addRequiredDoc(e.id, name)
      appendDoc(e.id, id, name)
      say(isComplete(e) ? `'${name}'을(를) 추가해서 이 건은 다시 처리 중으로 옮겼어요.` : `'${name}' 서류 칸을 추가했어요.`)
    } catch (err) {
      say(`추가하지 못했어요: ${(err as Error).message}`, { tone: 'error' })
    }
  }
  const docSuggestions = [...new Set(expenses.flatMap((x) => x.required_docs.map((d) => d.doc_type)))].sort()
  const onOpen = (d: DashDoc) => { if (d.file_path) openFile(d.file_path).catch((err: Error) => say(err.message, { tone: 'error' })) }

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

  const fileCount = scoped.reduce((n, e) => n + e.required_docs.filter((d) => d.file_path).length, 0)

  const tabBtn = (key: Box, label: string, n: number, Icon: typeof Archive) => (
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
        {tabBtn('files', '파일 보관함', fileCount, FolderArchive)}
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
              sections={sections} today={today} projectName={projectName} leaving={leaving} onToggle={toggle} onFile={onFile} onOpen={onOpen}
              onAddDoc={onAddDoc} docSuggestions={docSuggestions} />
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
            <CompletedBox expenses={done} projects={projects} onToggle={toggle} onFile={onFile} onOpen={onOpen}
              onAddDoc={onAddDoc} docSuggestions={docSuggestions} />
          </>
        ))}

      {box === 'files' && (
        <FilesBox expenses={scoped} projects={projects} today={today}
          projectLabel={filter.projectId ? (projects.find((p) => p.id === filter.projectId)?.short_name ?? '전체') : '전체'} />
      )}

      <Toast toast={toast} onClose={closeToast} />
    </Workspace>
  )
}
