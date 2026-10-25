import { useState } from 'react'
import { supabase } from '../lib/supabase'
import type { DashRisk } from '../lib/useDashboard'
import { RISK_LABEL } from './RiskTag'

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
    <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/30 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-lg" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold">위험 건 소명</h2>
        <p className="mt-1 text-sm text-gray-600">{expenseLabel}</p>
        <div className="mt-3 rounded bg-orange-50 px-3 py-2 text-sm text-orange-900">
          ⚠️ {RISK_LABEL[risk.rule_code]} — {risk.detail}
        </div>
        <label className="mt-4 block text-sm font-medium">
          소명 내용 <span className="text-red-600">*</span>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} autoFocus
            placeholder="예: 고객사 장애 대응으로 주말 근무, 근무 확인서 첨부"
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm" />
        </label>
        <p className="mt-1 text-xs text-gray-500">처리 이력에 남고, 나중에 지울 수 없어요.</p>
        {error && <p className="mt-2 text-sm text-red-700">저장 실패: {error}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="rounded px-4 py-2 text-sm text-gray-600 hover:bg-gray-100">취소</button>
          <button onClick={save} disabled={busy || !note.trim()}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:bg-gray-300">
            {busy ? '저장 중…' : '소명 완료'}
          </button>
        </div>
      </div>
    </div>
  )
}
