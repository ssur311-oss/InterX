import { useState } from 'react'
import { supabase } from '../lib/supabase'
import type { DashRisk } from '../lib/useDashboard'
import { RISK_LABEL } from './RiskTag'
import { BTN_GHOST, BTN_PRIMARY } from './ui'

type Props = { expenseId: string; expenseLabel: string; risk: DashRisk; onClose: () => void; onDone: () => void }

/** 위험 건 소명: 관리자가 내용을 적고 버튼을 눌러야 저장. 소명 내용은 처리 이력에 남는다 (RULE.md 2장) */
export function ResolveRiskDialog({ expenseId, expenseLabel, risk, onClose, onDone }: Props) {
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save() {
    if (!supabase || !note.trim()) return
    setBusy(true)
    // 이력을 먼저 남기고 표시를 바꾼다. 중간에 실패해도 근거 기록은 남는다.
    const log = await supabase.from('activity_log').insert({
      expense_id: expenseId,
      kind: 'memo',
      content: `[소명 완료] ${RISK_LABEL[risk.rule_code]} — ${note.trim()}`,
      source: 'manual',
    })
    const flag = log.error ? log : await supabase.from('risk_flags').update({ resolved: true }).eq('id', risk.id)
    setBusy(false)
    if (flag.error) return setError(flag.error.message)
    onDone()
  }

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-ink/20 p-5 backdrop-blur-sm" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="resolve-title" className="glass-strong animate-pop w-full max-w-md rounded-2xl p-6" onClick={(e) => e.stopPropagation()}>
        <h2 id="resolve-title" className="text-xl font-bold">위험 건 소명</h2>
        <p className="mt-1 text-body">{expenseLabel}</p>
        <div className="mt-4 rounded-xl bg-[#fff6db] px-4 py-3 text-[15px]">
          <b>{RISK_LABEL[risk.rule_code]}</b> — {risk.detail}
        </div>
        <label className="mt-4 block font-medium">
          소명 내용 <span className="text-danger">*</span>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} autoFocus
            placeholder="예: 고객사 장애 대응으로 주말 근무, 근무 확인서 첨부"
            className="mt-2 w-full rounded-lg border border-line bg-white/80 px-4 py-3 focus:border-brand" />
        </label>
        <p className="mt-2 text-[13px] text-body">처리 이력에 남고, 나중에 지울 수 없어요.</p>
        {error && <p className="mt-2 text-danger">저장 실패: {error}</p>}
        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className={BTN_GHOST}>취소</button>
          <button onClick={save} disabled={busy || !note.trim()}
            className={BTN_PRIMARY}>
            {busy ? '저장 중…' : '소명 완료'}
          </button>
        </div>
      </div>
    </div>
  )
}
