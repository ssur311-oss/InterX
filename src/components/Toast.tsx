import { useEffect } from 'react'
import { X } from 'lucide-react'

export type ToastMsg = { id: number; text: string; tone?: 'ok' | 'error'; undo?: () => void }

/** 화면 아래 알림. 되돌릴 수 있는 행동이면 '되돌리기'를 함께 보여준다 */
export function Toast({ toast, onClose }: { toast: ToastMsg | null; onClose: () => void }) {
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(onClose, 6000)
    return () => clearTimeout(t)
  }, [toast, onClose])

  if (!toast) return null
  return (
    <div role="status" className="fixed inset-x-0 bottom-6 z-30 flex justify-center px-5">
      <div key={toast.id} className="animate-pop flex max-w-xl items-center gap-4 rounded-2xl bg-ink/90 py-2 pr-2 pl-5 text-white shadow-xl backdrop-blur">
        <span className={toast.tone === 'error' ? 'font-semibold' : ''}>{toast.text}</span>
        {toast.undo && (
          <button onClick={() => { toast.undo?.(); onClose() }} className="min-h-11 shrink-0 rounded-lg px-3 font-semibold text-warn hover:bg-white/10">
            되돌리기
          </button>
        )}
        <button onClick={onClose} aria-label="알림 닫기" className="flex min-h-11 min-w-11 items-center justify-center rounded-lg hover:bg-white/10">
          <X size={18} aria-hidden />
        </button>
      </div>
    </div>
  )
}
