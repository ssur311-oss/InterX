import type { ReactNode } from 'react'

// 와이어프레임 공통 틀: 제목 + 설명 + 주요 행동 1개, 흰 카드
export function PageHeader({ title, desc, action }: { title: string; desc?: ReactNode; action?: ReactNode }) {
  return (
    <header className="mb-8 flex flex-wrap items-center justify-between gap-6">
      <div>
        <h1 className="mb-2 text-[32px] font-bold tracking-tight">{title}</h1>
        {desc && <p className="text-body">{desc}</p>}
      </div>
      {action}
    </header>
  )
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-xl border border-line bg-white p-6 ${className}`}>{children}</section>
}

export function Workspace({ children }: { children: ReactNode }) {
  return <div className="mx-auto max-w-[1264px] p-6 md:p-8">{children}</div>
}

/** 상태 신호등 점. 색만으로 구분하지 않도록 항상 글자와 함께 쓴다 */
export function Signal({ tone }: { tone: 'red' | 'yellow' | 'green' | 'blue' | 'gray' }) {
  const color = { red: 'bg-danger', yellow: 'bg-warn', green: 'bg-ok', blue: 'bg-brand', gray: 'bg-body' }[tone]
  return <i aria-hidden className={`mr-2 inline-block h-2 w-2 rounded-full ${color}`} />
}
