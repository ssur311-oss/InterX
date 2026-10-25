import { useCallback, useRef, useState } from 'react'
import type { ToastMsg } from '../components/Toast'
import { isComplete, setDocSubmitted, uncheckedStatus } from './docCheck'
import type { StoredStatus } from './rules/docStatus'
import type { DashDoc, DashExpense } from './useDashboard'

/** 서류 체크 → 화면 먼저 반영 → 저장. 한 건이 다 모이면 잠깐 빠지는 움직임과 '되돌리기' 알림 */
export function useDocToggle(patchDoc: (docId: string, status: StoredStatus) => void, reload: () => void) {
  const [leaving, setLeaving] = useState<Set<string>>(new Set())
  const [toast, setToast] = useState<ToastMsg | null>(null)
  const toastId = useRef(0)

  const closeToast = useCallback(() => setToast(null), [])
  const say = useCallback((text: string, extra: Partial<ToastMsg> = {}) => setToast({ id: ++toastId.current, text, ...extra }), [])

  const toggle = useCallback(
    async function toggle(e: DashExpense, d: DashDoc, checked: boolean) {
      const willComplete = checked && e.required_docs.every((x) => x.id === d.id || x.status === 'submitted')
      patchDoc(d.id, checked ? 'submitted' : uncheckedStatus(d))
      if (willComplete) {
        // 완료된 카드가 옆으로 빠지는 모습을 잠깐 보여준 뒤 완료함으로 옮긴다
        setLeaving((s) => new Set(s).add(e.id))
        setTimeout(() => setLeaving((s) => { const n = new Set(s); n.delete(e.id); return n }), 350)
        say(`'${e.description}' 서류를 모두 모아 완료함으로 옮겼어요.`, { undo: () => toggle(e, { ...d, status: 'submitted' }, false) })
      } else if (!checked && isComplete(e)) {
        say(`'${e.description}'을(를) 다시 처리 중으로 옮겼어요.`)
      }
      try {
        await setDocSubmitted(e.id, d, checked)
      } catch (err) {
        say(`저장하지 못했어요: ${(err as Error).message}. 화면을 원래대로 되돌렸어요.`, { tone: 'error' })
        reload()
      }
    },
    [patchDoc, reload, say],
  )

  return { toggle, leaving, toast, closeToast, say }
}
