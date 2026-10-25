import type { ReactNode } from 'react'

// 공통 틀: 제목 + 설명 + 주요 행동 1개, 유리 카드
export function PageHeader({ title, desc, action }: { title: string; desc?: ReactNode; action?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-[32px] leading-tight font-bold tracking-tight">{title}</h1>
        {desc && <p className="mt-2 text-body">{desc}</p>}
      </div>
      {action}
    </header>
  )
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`glass rounded-2xl p-6 ${className}`}>{children}</section>
}

export function CardTitle({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-2">
      <h2 className="text-xl font-semibold">{children}</h2>
      {aside}
    </div>
  )
}

/** fit: PC 화면에서 페이지 스크롤을 잠그고 화면 높이에 맞춘다 (긴 내용은 카드 안에서만 스크롤) */
export function Workspace({ children, fit = false }: { children: ReactNode; fit?: boolean }) {
  return (
    <div className={`mx-auto w-full max-w-[1200px] px-5 pt-2 pb-6 md:px-8 md:pb-8 ${fit ? 'md:flex md:min-h-0 md:flex-1 md:flex-col' : ''}`}>
      {children}
    </div>
  )
}

/** 버튼 모양. 주요 버튼(primary)은 화면당 1개만 쓴다 */
export const BTN_PRIMARY =
  'inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-brand px-6 font-semibold text-white shadow-[0_8px_16px_color-mix(in_srgb,var(--color-brand)_25%,transparent)] hover:bg-brand-strong disabled:bg-muted disabled:shadow-none'
export const BTN =
  'inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-white/90 bg-white/70 px-4 font-medium text-ink shadow-sm hover:bg-white disabled:opacity-50'
export const BTN_GHOST = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-3 text-body hover:bg-white/70'
export const SELECT = 'min-h-12 rounded-lg border border-white/90 bg-white/70 px-4 shadow-sm'

/** 상태 신호등 점. 색만으로 구분하지 않도록 항상 글자와 함께 쓴다 */
export function Signal({ tone }: { tone: 'red' | 'yellow' | 'green' | 'blue' | 'gray' }) {
  const color = { red: 'bg-danger', yellow: 'bg-warn', green: 'bg-ok', blue: 'bg-brand', gray: 'bg-muted' }[tone]
  return <i aria-hidden className={`mr-2 inline-block h-2 w-2 rounded-full ${color}`} />
}

/** 빈 화면: 지금 상태 + 채우는 방법 + 버튼 하나 */
export function Empty({ icon, title, desc, action }: { icon: ReactNode; title: string; desc: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed border-line bg-white/40 px-6 py-12 text-center">
      <div className="mb-4 text-brand">{icon}</div>
      <h3 className="text-xl font-semibold">{title}</h3>
      <p className="mt-2 max-w-md text-body">{desc}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}
