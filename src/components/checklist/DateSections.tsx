import { useEffect, useRef, useState } from 'react'
import { daysBetween, weekdayOf } from '../../lib/date'
import type { DashDoc, DashExpense } from '../../lib/useDashboard'
import { ExpenseCard } from './ExpenseCard'

export type DateSection = { date: string; isToday: boolean; expenses: DashExpense[] }

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']
const STEP = 2 // 스크롤이 끝에 닿을 때마다 더 보여줄 날짜 구간 수

function dotDate(date: string) {
  const [, m, d] = date.split('-').map(Number)
  return `${m}.${d}(${WEEKDAYS[weekdayOf(date)]})`
}

type Props = {
  sections: DateSection[]
  today: string
  projectName: (id: string) => string
  leaving: Set<string>
  onToggle: (e: DashExpense, d: DashDoc, checked: boolean) => void
  onFile?: (e: DashExpense, d: DashDoc, file: File) => Promise<void>
  onOpen?: (d: DashDoc) => void
  onAddDoc?: (e: DashExpense, name: string) => Promise<void>
  docSuggestions?: string[]
}

/** 날짜 구간: "Today 10.25 ······ 오늘 들어온 3건". 아래로 내리면 더 예전 날짜 구간이 이어서 나온다 */
export function DateSections({ sections, today, projectName, leaving, onToggle, onFile, onOpen, onAddDoc, docSuggestions }: Props) {
  const [shown, setShown] = useState(STEP)
  const sentinel = useRef<HTMLDivElement>(null)
  const more = shown < sections.length

  useEffect(() => {
    const el = sentinel.current
    if (!el || !more) return
    const io = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) setShown((n) => n + STEP)
    }, { rootMargin: '200px' })
    io.observe(el)
    return () => io.disconnect()
  }, [more, shown])

  return (
    <div className="space-y-10">
      {sections.slice(0, shown).map((s) => (
          <section key={s.date} aria-label={`${dotDate(s.date)}에 들어온 건`}>
            <header className="mb-4 flex items-center gap-4">
              <h2 className="flex items-baseline gap-2 text-xl font-bold whitespace-nowrap">
                {s.isToday && <span className="text-brand">Today</span>}
                {dotDate(s.date)}
                {!s.isToday && <span className="text-[15px] font-medium text-body">{daysBetween(s.date, today)}일 전</span>}
              </h2>
              <span aria-hidden className="h-0 flex-1 border-t-2 border-dotted border-muted/50" />
              <span className="text-[15px] whitespace-nowrap text-body">
                {s.isToday ? '오늘 들어온' : '들어온'} <b className="text-ink">{s.expenses.length}건</b>
              </span>
            </header>
            <div className="space-y-4">
              {s.expenses.map((e) => (
                <ExpenseCard key={e.id} expense={e} projectName={projectName(e.project_id)} leaving={leaving.has(e.id)}
                  onToggle={(d, c) => onToggle(e, d, c)} onFile={onFile && ((d, f) => onFile(e, d, f))} onOpen={onOpen}
                  onAddDoc={onAddDoc && ((name) => onAddDoc(e, name))} docSuggestions={docSuggestions} />
              ))}
            </div>
          </section>
      ))}
      {more ? (
        <div ref={sentinel} className="py-6 text-center text-[15px] text-body">이전 날짜 불러오는 중…</div>
      ) : (
        sections.length > 1 && <p className="py-6 text-center text-[15px] text-body">가장 처음 들어온 날까지 다 봤어요.</p>
      )}
    </div>
  )
}
