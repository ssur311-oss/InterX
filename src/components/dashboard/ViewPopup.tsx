import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, X } from 'lucide-react'
import { applyFilter, VIEW_LABEL, type SummaryView } from '../../lib/dashboardFilter'
import type { DashDoc, DashExpense } from '../../lib/useDashboard'
import { ExpenseCard } from '../checklist/ExpenseCard'
import { BTN } from '../ui'

type Props = {
  view: SummaryView
  expenses: DashExpense[]
  today: string
  projectName: (id: string) => string
  onToggle: (e: DashExpense, d: DashDoc, checked: boolean) => void
  onClose: () => void
}

/** 요약 카드를 누르면 뜨는 창. 체크리스트와 같은 카드라 여기서 바로 체크할 수 있다 */
export function ViewPopup({ view, expenses, today, projectName, onToggle, onClose }: Props) {
  // 체크해서 조건에서 빠져도 창을 닫기 전까지는 그 자리에 둔다 (눌렀던 카드가 사라지지 않게)
  const [ids] = useState(() => applyFilter(expenses, { view, projectId: '', personId: '' }, today).map((e) => e.id))
  const list = ids.flatMap((id) => expenses.find((e) => e.id === id) ?? [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-ink/20 p-5 backdrop-blur-sm" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="view-popup-title" onClick={(e) => e.stopPropagation()}
        className="glass-strong animate-pop flex max-h-full w-full max-w-3xl flex-col rounded-3xl">
        <header className="flex items-center justify-between gap-4 px-6 pt-6 pb-4">
          <div>
            <h2 id="view-popup-title" className="text-2xl font-bold">{VIEW_LABEL[view]}</h2>
            <p className="mt-1 text-body">{list.length}건 · 받은 서류를 바로 체크할 수 있어요.</p>
          </div>
          <button onClick={onClose} aria-label="닫기" className="flex h-11 w-11 items-center justify-center rounded-lg text-body hover:bg-white/70">
            <X size={20} aria-hidden />
          </button>
        </header>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 pb-2">
          {list.length === 0 ? (
            <p className="rounded-xl bg-white/60 p-6 text-center text-body">해당하는 서류가 없어요.</p>
          ) : (
            list.map((e) => (
              <ExpenseCard key={e.id} expense={e} projectName={projectName(e.project_id)} onToggle={(d, c) => onToggle(e, d, c)} />
            ))
          )}
        </div>
        <footer className="flex justify-end px-6 py-4">
          <Link to={`/checklist?view=${view}`} className={BTN}>
            체크리스트에서 보기 <ArrowRight aria-hidden size={18} />
          </Link>
        </footer>
      </div>
    </div>
  )
}
