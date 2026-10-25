import { attachCandidates, type ReceiptDraft } from '../../lib/aiReceipt'
import { normalize } from '../../lib/rules/docRules'
import { formatDate, formatWon } from '../../lib/format'
import type { DashExpense } from '../../lib/useDashboard'
import { StatusText } from '../StatusBadge'

type Props = {
  d: ReceiptDraft
  expenses: DashExpense[]
  projectName: (id: string) => string
  onChange: (patch: Partial<ReceiptDraft>) => void
}

/** 기존 집행 건의 서류로 체크: 비슷한 건을 보여주고, 건과 서류 칸은 관리자가 직접 고른다 */
export function AttachPicker({ d, expenses, projectName, onChange }: Props) {
  const candidates = attachCandidates(d, expenses)
  const chosen = expenses.find((e) => e.id === d.attachExpenseId)
  const openDocs = chosen?.required_docs.filter((x) => x.status !== 'submitted') ?? []

  if (!candidates.length) {
    return <p className="rounded-xl bg-white/70 p-3 text-body">아직 안 낸 서류가 있는 집행 건이 없어요. "새 집행 건 등록"으로 바꿔서 처리할 수 있어요.</p>
  }

  return (
    <div>
      <h4 className="mb-2 text-[14px] font-semibold">어느 집행 건의 서류인가요? <span className="font-normal text-body">(비슷한 순서)</span></h4>
      <ul className="space-y-2">
        {candidates.map(({ e, score }) => (
          <li key={e.id}>
            <label className={`flex min-h-11 cursor-pointer flex-wrap items-center gap-x-2 gap-y-1 rounded-xl border px-3 py-2 ${
              d.attachExpenseId === e.id ? 'border-brand bg-brand-soft' : 'border-line bg-white'}`}>
              <input type="radio" name={`attach-${d.key}`} checked={d.attachExpenseId === e.id} className="h-4 w-4 accent-brand"
                onChange={() => {
                  // 고른 건에서 AI가 말한 서류 종류와 같은 칸이 있으면 미리 골라 둔다 (관리자가 바꿀 수 있음)
                  const same = e.required_docs.find((x) => x.status !== 'submitted' && normalize(x.doc_type) === normalize(d.docType))
                  onChange({ attachExpenseId: e.id, attachDocId: same?.id ?? '' })
                }} />
              <b>{formatDate(e.paid_at)} {e.description}</b>
              <span className="text-[13px] text-body">{projectName(e.project_id)} · {e.vendor ?? '거래처 없음'} · {formatWon(e.amount)} · {e.people?.name ?? '담당자 없음'}</span>
              {score >= 5 && <span className="rounded-full bg-accent-soft px-2 text-[12px] font-semibold text-accent-ink">많이 비슷해요</span>}
            </label>
          </li>
        ))}
      </ul>

      {chosen && (
        <>
          <h4 className="mt-3 mb-2 text-[14px] font-semibold">어떤 서류 칸에 체크할까요?</h4>
          <div className="flex flex-wrap gap-2">
            {openDocs.map((x) => (
              <label key={x.id} className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border px-3 ${
                d.attachDocId === x.id ? 'border-brand bg-brand-soft' : 'border-line bg-white'}`}>
                <input type="radio" name={`doc-${d.key}`} checked={d.attachDocId === x.id} className="h-4 w-4 accent-brand"
                  onChange={() => onChange({ attachDocId: x.id })} />
                {x.doc_type} <StatusText state={x.state} plannedDate={x.planned_date} />
              </label>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
