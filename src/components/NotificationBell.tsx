import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Bell, FileText, X } from 'lucide-react'
import { formatDate } from '../lib/format'
import { parseHolidays } from '../lib/rules/deadline'
import { upcomingAlerts, type Alert } from '../lib/schedules'
import type { Schedule } from '../lib/types'
import { useDashboard } from '../lib/useDashboard'
import { useRows } from '../lib/useRows'

const dLabel = (left: number) => (left === 0 ? '오늘' : `D-${left}`)

function AlertItem({ a }: { a: Alert }) {
  return (
    <li className="rounded-2xl bg-white/70 p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="mr-2 rounded-full bg-brand-soft px-2 py-0.5 text-[13px] font-medium text-brand">{a.kind}</span>
          <b className="text-lg">{a.title}</b>
          <div className="mt-1 text-[13px] text-body">{formatDate(a.date)}{a.note && ` · ${a.note}`}</div>
        </div>
        <b className={`shrink-0 rounded-full px-3 py-1 text-[15px] ${a.left <= 1 ? 'bg-[#fdecea] text-danger' : 'bg-white text-ink'}`}>{dLabel(a.left)}</b>
      </div>
      {a.docs.length > 0 && (
        <div className="mt-3">
          <div className="mb-1 text-[13px] font-medium text-body">준비할 서류</div>
          <ul className="flex flex-wrap gap-2">
            {a.docs.map((d) => (
              <li key={d} className="flex min-h-8 items-center gap-1 rounded-lg border border-line bg-white px-2 text-[14px]">
                <FileText aria-hidden size={14} className="text-brand" /> {d}
              </li>
            ))}
          </ul>
        </div>
      )}
    </li>
  )
}

/** 종 알림: 다가오는 마감·반복 일정 수를 빨간 배지로 보여주고, 누르면 준비 서류까지 알려준다 */
export function NotificationBell() {
  const { expenses, projects, settings, today } = useDashboard()
  const { rows: schedules } = useRows<Schedule>('schedules', 'base_date')
  const [open, setOpen] = useState(false)

  const alerts = useMemo(() => {
    const openDocs = new Map<string, number>()
    for (const e of expenses) openDocs.set(e.project_id, (openDocs.get(e.project_id) ?? 0) + e.required_docs.filter((d) => d.status !== 'submitted').length)
    return upcomingAlerts(schedules, projects, parseHolidays(settings), today, openDocs)
  }, [schedules, projects, settings, expenses, today])

  // 오늘이나 내일 기한인 일정이 있으면 하루에 한 번 자동으로 열어 준다
  useEffect(() => {
    if (!alerts.some((a) => a.left <= 1)) return
    const key = `bell-auto-${today}`
    try {
      if (localStorage.getItem(key)) return
      localStorage.setItem(key, '1')
    } catch {
      return
    }
    setOpen(true)
  }, [alerts, today])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <>
      <button onClick={() => setOpen(true)} aria-label={`알림 ${alerts.length}개`} aria-haspopup="dialog"
        className="relative flex h-11 w-11 items-center justify-center rounded-lg hover:bg-white/60">
        <Bell aria-hidden size={20} className="text-ink" />
        {alerts.length > 0 && (
          <span className="absolute top-1 right-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-danger bg-white px-1 text-[11px] leading-none font-bold text-danger">
            {alerts.length}
          </span>
        )}
      </button>

      {/* 위쪽 바의 흐림 효과 안에 갇히지 않도록 화면 맨 바깥(body)에 띄운다 */}
      {open && createPortal(
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-ink/20 p-5 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div role="dialog" aria-modal="true" aria-labelledby="bell-title" onClick={(e) => e.stopPropagation()}
            className="glass-strong animate-pop flex max-h-full w-full max-w-xl flex-col rounded-3xl">
            <header className="flex items-center justify-between px-6 pt-6 pb-4">
              <div>
                <h2 id="bell-title" className="text-2xl font-bold">다가오는 기한</h2>
                <p className="mt-1 text-body">기한이 가까운 순서예요. 준비할 서류를 미리 챙겨 두세요.</p>
              </div>
              <button onClick={() => setOpen(false)} aria-label="닫기" className="flex h-11 w-11 items-center justify-center rounded-lg text-body hover:bg-white/70">
                <X size={20} aria-hidden />
              </button>
            </header>
            <ul className="min-h-0 flex-1 space-y-3 overflow-y-auto px-6 pb-6">
              {alerts.length === 0 ? (
                <li className="rounded-2xl bg-white/60 p-6 text-center text-body">
                  가까운 기한이 없어요. 반복 일정은 설정 &gt; 반복 일정에서 추가할 수 있어요.
                </li>
              ) : (
                alerts.map((a) => <AlertItem key={a.id} a={a} />)
              )}
            </ul>
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}
