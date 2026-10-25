import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, ChartPie, FileSpreadsheet, Wallet } from 'lucide-react'
import { BudgetBars, BudgetChart, pctText } from '../components/charts/BudgetChart'
import { EvidenceDonut } from '../components/charts/EvidenceDonut'
import { PeopleBars } from '../components/charts/PeopleBars'
import { ProjectProgress } from '../components/charts/ProjectProgress'
import { PersonNotice } from '../components/dashboard/PersonNotice'
import { TodaySummary } from '../components/dashboard/TodaySummary'
import { ViewPopup } from '../components/dashboard/ViewPopup'
import { Toast } from '../components/Toast'
import { BTN_PRIMARY, Card, CardTitle, Empty, PageHeader, Workspace } from '../components/ui'
import { budgetByCategory, budgetByProject, budgetTotal } from '../lib/budget'
import { countViews, type SummaryView } from '../lib/dashboardFilter'
import { formatDate } from '../lib/format'
import { STATE_ORDER, type DocState } from '../lib/rules/docStatus'
import { useDashboard } from '../lib/useDashboard'
import { useDocToggle } from '../lib/useDocToggle'

type Panel = 'evidence' | 'budget'

export default function Dashboard() {
  const { expenses, projects, people, budget, today, error, loading, reload, patchDoc } = useDashboard()
  const { toggle, toast, closeToast, say } = useDocToggle(patchDoc, reload)
  const [noticeFor, setNoticeFor] = useState<string | null>(null)
  const noticePerson = people.find((p) => p.id === noticeFor)
  const [panel, setPanel] = useState<Panel>('evidence')
  const [popup, setPopup] = useState<SummaryView | null>(null)
  const counts = useMemo(() => countViews(expenses, today), [expenses, today])

  const stateCounts = useMemo(() => {
    const c = Object.fromEntries(STATE_ORDER.map((s) => [s, 0])) as Record<DocState, number>
    for (const d of expenses.flatMap((e) => e.required_docs)) c[d.state] += 1
    return c
  }, [expenses])
  const docTotal = STATE_ORDER.reduce((n, s) => n + stateCounts[s], 0)
  const submitRate = docTotal ? Math.round((stateCounts.submitted / docTotal) * 100) : 0
  const budgetRate = budgetTotal(budgetByCategory(budget, expenses)).rate
  const projectName = (id: string) => projects.find((p) => p.id === id)?.short_name ?? ''

  if (loading) return <Workspace><p className="text-body">불러오는 중…</p></Workspace>
  if (error) return <Workspace><p className="text-danger">데이터를 불러오지 못했어요: {error}. 인터넷 연결을 확인하고 새로고침해 주세요.</p></Workspace>

  if (expenses.length === 0) {
    return (
      <Workspace>
        <PageHeader title="대시보드" />
        <Empty
          icon={<FileSpreadsheet size={40} />}
          title="아직 등록된 집행 건이 없어요"
          desc="연구비 시스템이나 카드사에서 받은 집행 내역 엑셀을 올리면, 건마다 필요한 서류 목록이 자동으로 만들어져요."
          action={<Link to="/upload" className={BTN_PRIMARY}>엑셀 올리기</Link>}
        />
      </Workspace>
    )
  }

  // 아래 화면을 바꾸는 버튼. 요약 카드 3개 옆 남는 자리에 둔다
  const panelBtn = (key: Panel, Icon: typeof Wallet, label: string, value: string) => (
    <button onClick={() => setPanel(key)} aria-pressed={panel === key}
      className={`rounded-2xl p-5 text-left ${panel === key ? 'bg-brand text-white shadow-[0_8px_24px_rgb(45_91_255/0.3)]' : 'glass hover:bg-white/80'}`}>
      <div className={`flex items-center gap-2 text-[15px] font-medium ${panel === key ? 'text-white' : 'text-body'}`}>
        <Icon aria-hidden size={18} className={panel === key ? '' : 'text-brand'} />
        {label}
      </div>
      <div className="mt-2 text-[32px] leading-none font-bold">{value}</div>
      <div className={`mt-2 text-[13px] ${panel === key ? 'text-white' : 'text-body'}`}>
        {panel === key ? '아래에서 보는 중' : '눌러서 아래 화면 바꾸기'}
      </div>
    </button>
  )

  return (
    <Workspace>
      <PageHeader
        title="대시보드"
        desc={
          <>
            {formatDate(today)} 기준 ·{' '}
            {counts.overdue > 0 ? <>약속일이 지난 서류 <b className="text-danger">{counts.overdue}개</b>를 먼저 확인해 주세요.</> : '급한 서류는 없어요.'}
          </>
        }
        action={
          <Link to="/checklist" className={BTN_PRIMARY}>
            증빙 체크하기 <ArrowRight size={18} aria-hidden />
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <TodaySummary counts={counts} onSelect={setPopup} />
        {panelBtn('evidence', ChartPie, '증빙 현황', `${submitRate}%`)}
        {panelBtn('budget', Wallet, '예산 집행 현황', budget.length ? pctText(budgetRate) : '—')}
      </div>

      {panel === 'evidence' ? (
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <Card>
            <CardTitle>전체 증빙 진행</CardTitle>
            <EvidenceDonut counts={stateCounts} />
          </Card>
          <Card>
            <CardTitle>과제별 진행 · 사내 마감</CardTitle>
            <ProjectProgress projects={projects} expenses={expenses} today={today} />
          </Card>
          <Card>
            <CardTitle aside={<span className="text-[13px] text-body">이름을 누르면 슬랙 메시지</span>}>사람별 남은 서류</CardTitle>
            <PeopleBars expenses={expenses} onSelect={setNoticeFor} />
          </Card>
        </div>
      ) : budget.length ? (
        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <Card>
            <CardTitle>비목별 집행률</CardTitle>
            <BudgetChart budget={budget} projects={projects} expenses={expenses} />
          </Card>
          <Card>
            <CardTitle>과제별 집행률</CardTitle>
            <BudgetBars rows={budgetByProject(budget, expenses, projects)} />
          </Card>
        </div>
      ) : (
        <Card className="mt-6">
          <p className="text-body">과제별 예산이 아직 없어요. 예산(비목별 계획액)을 넣으면 집행률 그래프가 보여요.</p>
        </Card>
      )}

      {popup && (
        <ViewPopup view={popup} expenses={expenses} today={today} projectName={projectName}
          onToggle={toggle} onClose={() => setPopup(null)} />
      )}
      {noticePerson && (
        <PersonNotice person={noticePerson} expenses={expenses} projects={projects} onClose={() => setNoticeFor(null)}
          onSent={(msg) => { setNoticeFor(null); say(msg) }} />
      )}
      <Toast toast={toast} onClose={closeToast} />
    </Workspace>
  )
}
