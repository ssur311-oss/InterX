import { useEffect, useState, type ReactNode } from 'react'
import {
  ArrowRight, CalendarDays, FileSpreadsheet, LayoutDashboard, ListChecks, MonitorDown, Settings, Sparkles, X,
} from 'lucide-react'
import { BTN_GHOST, BTN_PRIMARY } from './ui'

const DONE_KEY = 'onboarding-v2-done' // 내용이 바뀌면 숫자를 올려 다시 보여준다

type Step = { Icon: typeof Sparkles; title: string; body: ReactNode }

function Flow() {
  const items = [
    { Icon: FileSpreadsheet, label: '엑셀 올리기' },
    { Icon: ListChecks, label: '서류 체크' },
    { Icon: CalendarDays, label: '마감 챙기기' },
  ]
  return (
    <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
      {items.map(({ Icon, label }, i) => (
        <div key={label} className="flex items-center gap-2">
          {i > 0 && <ArrowRight aria-hidden size={18} className="text-muted" />}
          <span className="flex min-h-11 items-center gap-2 rounded-full bg-white/80 px-4 text-[15px] font-medium shadow-sm">
            <Icon aria-hidden size={18} className="text-brand" />
            {label}
          </span>
        </div>
      ))}
    </div>
  )
}

const Points = ({ items }: { items: ReactNode[] }) => (
  <ul className="mt-4 space-y-2 text-left">
    {items.map((t, i) => (
      <li key={i} className="flex gap-2">
        <span aria-hidden className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
        <span>{t}</span>
      </li>
    ))}
  </ul>
)

const STEPS: Step[] = [
  {
    Icon: Sparkles,
    title: 'in check예요',
    body: (
      <>
        <p>매달 사업비 증빙을 모으고, 빠진 서류를 챙기고, 마감을 지키는 일을 도와줘요. 큰 흐름은 세 단계예요.</p>
        <Flow />
      </>
    ),
  },
  {
    Icon: FileSpreadsheet,
    title: '엑셀 등록 — 시작하는 입구',
    body: (
      <Points items={[
        <>엑셀은 <b>관리하는 곳이 아니라 한 번 올리는 입구</b>예요. 관리는 이 프로그램 안에서 해요.</>,
        '연구비 관리 시스템이나 카드사에서 내려받은 집행 내역을 그대로 올리면 돼요.',
        <>올리면 건마다 <b>필요한 서류 목록</b>(세금계산서, 검수조서 등)이 규칙표대로 자동으로 만들어져요.</>,
      ]} />
    ),
  },
  {
    Icon: LayoutDashboard,
    title: '대시보드 — 한눈에 보기',
    body: (
      <Points items={[
        <><b>약속일 경과 · 오늘 제출 예정 · 변동 사항</b> 카드를 누르면 해당 건이 창으로 떠서 바로 체크할 수 있어요.</>,
        '전체 제출률, 과제별 진행·마감 D-day, 사람별 남은 서류를 그래프로 보여줘요.',
        <>오른쪽 <b>예산 집행 현황</b> 버튼을 누르면 아래 화면이 비목별·과제별 집행률로 바뀌어요.</>,
      ]} />
    ),
  },
  {
    Icon: ListChecks,
    title: '증빙 체크리스트 — 매일 쓰는 곳',
    body: (
      <Points items={[
        <>엑셀로 <b>등록한 날짜별</b>로 나뉘어요. 맨 위가 Today, 아래로 내리면 예전에 들어온 날짜가 이어서 나와요.</>,
        <>서류를 받으면 체크하세요. 체크할 때마다 <b>언제 확인했는지 기록</b>이 남아요.</>,
        <>한 건의 서류를 모두 체크하면 그 건은 <b>완료함</b>으로 옮겨지고, 과제별로 한곳에 모여요.</>,
        '잘못 체크했으면 알림의 "되돌리기"나 체크 해제로 돌릴 수 있어요.',
      ]} />
    ),
  },
  {
    Icon: CalendarDays,
    title: '마감 캘린더 — 언제까지',
    body: (
      <Points items={[
        '정산 기한을 넣으면 사내 마감일과 리마인드(D-7·D-3·D-1)를 거꾸로 계산해 달력에 표시해요.',
        '직원이 "언제까지 낼게요"라고 한 제출 예정일도 함께 보여요.',
        '사내 마감보다 늦은 약속은 따로 표시돼서 미리 조율할 수 있어요.',
      ]} />
    ),
  },
  {
    Icon: Settings,
    title: '설정 — 판단 기준',
    body: (
      <Points items={[
        '과제(정산 기한), 사람(슬랙 ID), 비목별 필요 서류 규칙표, 위험 기준값을 바꿀 수 있어요.',
        '협약이나 지침이 바뀌면 코드 수정 없이 여기서 고치면 돼요.',
        <>슬랙 메시지 정리·독촉 메시지 작성, 파일명 정리는 <b>다음 단계에서 추가</b>될 예정이에요.</>,
      ]} />
    ),
  },
  {
    Icon: MonitorDown,
    title: '프로그램처럼 쓰기',
    body: (
      <Points items={[
        <>크롬이나 엣지 주소창 오른쪽의 <b>설치 아이콘</b>을 누르면 바탕화면에 아이콘이 생기고, 주소창 없는 창으로 열려요.</>,
        '이 안내는 왼쪽 메뉴 아래 "사용 안내"에서 언제든 다시 볼 수 있어요.',
      ]} />
    ),
  },
]

export function shouldShowOnboarding(): boolean {
  try {
    return localStorage.getItem(DONE_KEY) !== '1'
  } catch {
    return false
  }
}

export function Onboarding({ onClose }: { onClose: () => void }) {
  const [i, setI] = useState(0)
  const last = i === STEPS.length - 1
  const { Icon, title, body } = STEPS[i]

  function finish() {
    try {
      localStorage.setItem(DONE_KEY, '1')
    } catch {
      // 저장이 막혀 있으면 다음에 다시 보일 뿐이라 무시한다
    }
    onClose()
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') finish()
      if (e.key === 'ArrowRight' && !last) setI((n) => n + 1)
      if (e.key === 'ArrowLeft' && i > 0) setI((n) => n - 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-ink/25 p-5 backdrop-blur-sm">
      <div role="dialog" aria-modal="true" aria-labelledby="onb-title" className="glass-strong animate-pop relative w-full max-w-lg rounded-3xl p-8">
        <button onClick={finish} aria-label="안내 닫기" className="absolute top-4 right-4 flex h-11 w-11 items-center justify-center rounded-lg text-body hover:bg-white/70">
          <X size={20} aria-hidden />
        </button>

        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-soft text-brand">
          <Icon aria-hidden size={28} />
        </div>
        <p className="text-[13px] font-medium text-brand">{i + 1} / {STEPS.length}</p>
        <h2 id="onb-title" className="mt-1 text-2xl font-bold">{title}</h2>
        <div key={i} className="mt-2 min-h-[180px] leading-relaxed text-body">{body}</div>

        <div className="mt-6 flex items-center justify-between gap-2">
          <div className="flex gap-1.5" aria-hidden>
            {STEPS.map((_, n) => (
              <span key={n} className={`h-2 rounded-full transition-all ${n === i ? 'w-6 bg-brand' : 'w-2 bg-muted/40'}`} />
            ))}
          </div>
          <div className="flex gap-2">
            {i > 0 ? (
              <button onClick={() => setI(i - 1)} className={BTN_GHOST}>이전</button>
            ) : (
              <button onClick={finish} className={BTN_GHOST}>건너뛰기</button>
            )}
            <button autoFocus onClick={() => (last ? finish() : setI(i + 1))} className={BTN_PRIMARY}>
              {last ? '시작하기' : '다음'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
