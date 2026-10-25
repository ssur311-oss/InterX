import { useEffect } from 'react'
import { X } from 'lucide-react'
import type { Person } from '../../lib/types'
import type { DashExpense, ProjectWithDeadline } from '../../lib/useDashboard'
import { NoticeComposer } from './NoticeComposer'

type Props = {
  person: Person
  expenses: DashExpense[]
  projects: ProjectWithDeadline[]
  onClose: () => void
  onSent: (text: string) => void
}

/** 대시보드 '사람별 남은 서류'에서 이름을 누르면 뜨는 창. 내용은 NoticeComposer가 담당 */
export function PersonNotice({ person, expenses, projects, onClose, onSent }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-ink/20 p-5 backdrop-blur-sm" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="notice-title" onClick={(e) => e.stopPropagation()}
        className="glass-strong animate-pop flex max-h-full w-full max-w-2xl flex-col rounded-3xl p-6">
        <header className="mb-1 flex items-start justify-between gap-4">
          <h2 id="notice-title" className="text-2xl font-bold">{person.name}님에게 보낼 메시지</h2>
          <button onClick={onClose} aria-label="닫기" className="flex h-11 w-11 items-center justify-center rounded-lg text-body hover:bg-white/70">
            <X size={20} aria-hidden />
          </button>
        </header>
        <NoticeComposer person={person} expenses={expenses} projects={projects} onSent={onSent} />
      </div>
    </div>
  )
}
