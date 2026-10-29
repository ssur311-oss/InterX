import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Loader2, RotateCcw, Sparkles, TriangleAlert } from 'lucide-react'
import {
  applySlack, CONFIDENCE_LABEL, expenseLabel, matchesHint, openDocs, readSlack, SLACK_TYPE_LABEL, type SlackResult,
} from '../../lib/aiSlack'
import { formatDate } from '../../lib/format'
import { useDashboard } from '../../lib/useDashboard'
import { StatusText } from '../StatusBadge'
import { BTN, BTN_PRIMARY } from '../ui'
import type { MoniState } from './AiAssistantCharacter'

const input = 'min-h-11 rounded-lg border border-line bg-white px-3 focus:border-brand'

/** 슬랙 메시지 붙여넣기 → AI 정리 → 관리자가 집행 건·서류를 골라 [반영] (RULE.md 5장) */
export function SlackPanel({ onMood }: { onMood?: (s: MoniState, ms?: number) => void }) {
  const { expenses, people, projects, today, reload } = useDashboard()
  const [senderId, setSenderId] = useState('')
  const [message, setMessage] = useState('')
  const [result, setResult] = useState<SlackResult | null>(null)
  const [expenseId, setExpenseId] = useState('')
  const [docIds, setDocIds] = useState<Set<string>>(new Set())
  const [planned, setPlanned] = useState('')
  const [busy, setBusy] = useState<'read' | 'save' | null>(null)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const sender = people.find((p) => p.id === senderId)
  const mine = expenses.filter((e) => e.owner_id === senderId && openDocs(e).length > 0)
  const chosen = mine.find((e) => e.id === expenseId)
  const deadline = chosen ? projects.find((p) => p.id === chosen.project_id)?.deadline ?? null : null
  const actionable = result?.type === 'delay' || result?.type === 'submitted'

  function reset() {
    setResult(null)
    setExpenseId('')
    setDocIds(new Set())
    setPlanned('')
  }

  async function read() {
    if (!sender || !message.trim()) return
    setBusy('read')
    setMsg(null)
    reset()
    onMood?.('reading')
    try {
      const r = await readSlack(message, sender.name, mine, today)
      setResult(r)
      setPlanned(r.planned_date ?? '')
      onMood?.('speaking', 900)
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message })
      onMood?.('error', 3000)
    }
    setBusy(null)
  }

  function pickExpense(id: string) {
    setExpenseId(id)
    // 고른 집행 건에서 AI가 말한 서류 종류를 미리 체크해 둔다 (관리자가 풀 수 있음)
    const e = mine.find((x) => x.id === id)
    setDocIds(new Set(e ? openDocs(e).filter((d) => result?.doc_types.includes(d.doc_type)).map((d) => d.id) : []))
  }

  async function save() {
    if (!result || !sender) return
    setBusy('save')
    try {
      await applySlack({
        type: result.type,
        expenseId: chosen?.id ?? null,
        docs: chosen ? openDocs(chosen).filter((d) => docIds.has(d.id)) : [],
        plannedDate: planned || null,
        senderName: sender.name,
        message,
        summary: result.summary,
      })
      setMsg({ ok: true, text: actionable ? '반영하고 처리 이력에 원문을 남겼어요.' : '처리 이력에 메모로 남겼어요.' })
      setMessage('')
      reset()
      reload()
      onMood?.('success', 2600)
    } catch (e) {
      setMsg({ ok: false, text: `반영하지 못했어요: ${(e as Error).message}` })
      onMood?.('error', 3000)
    }
    setBusy(null)
  }

  const canSave = actionable
    ? Boolean(chosen && docIds.size > 0 && (result!.type !== 'delay' || /^\d{4}-\d{2}-\d{2}$/.test(planned)))
    : Boolean(result)

  return (
    <>
      {msg && (
        <div role="status" className={`mb-4 rounded-xl border-l-4 bg-white/80 px-4 py-3 ${msg.ok ? 'border-l-ok' : 'border-l-danger'}`}>
          {msg.text}
          {msg.ok && <Link to="/checklist" className="ml-2 font-semibold text-brand underline">체크리스트에서 보기</Link>}
        </div>
      )}

      <div className="grid gap-3">
        <label className="block">
          <span className="mb-1 block text-[13px] font-medium text-body">보낸 사람</span>
          <select className={`${input} w-full sm:w-64`} value={senderId} onChange={(e) => { setSenderId(e.target.value); reset() }}>
            <option value="">골라 주세요</option>
            {people.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.role})</option>)}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-[13px] font-medium text-body">슬랙 메시지 원문</span>
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={4} maxLength={4000}
            placeholder="예) 시편 세금계산서는 업체 발행이 늦어서 다음 주 수요일까지 드릴게요!"
            className="w-full resize-none rounded-xl border border-line bg-white/85 p-3 leading-relaxed focus:border-brand" />
        </label>
        <div className="flex justify-end">
          <button onClick={read} disabled={!sender || !message.trim() || busy !== null} className={BTN_PRIMARY}>
            {busy === 'read' ? <Loader2 aria-hidden size={18} className="animate-spin" /> : <Sparkles aria-hidden size={18} />}
            {busy === 'read' ? '모니가 읽는 중…' : 'AI로 정리하기'}
          </button>
        </div>
      </div>

      {result && sender && (
        <section className="mt-4 rounded-2xl bg-white/85 p-4" aria-label="AI 정리 결과">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-accent-soft px-3 py-1 text-[13px] font-semibold text-accent-ink">{SLACK_TYPE_LABEL[result.type]}</span>
            <span className="text-[13px] text-body">AI 판단: {CONFIDENCE_LABEL[result.confidence]}</span>
          </div>
          <p className="mt-2 text-lg font-semibold">{result.summary}</p>
          {result.reason && <p className="text-body">사유: {result.reason}</p>}
          {result.needs_admin_check && (
            <p className="mt-2 flex items-center gap-1 rounded-lg bg-[#fff6db] px-3 py-2 text-[14px]">
              <TriangleAlert aria-hidden size={16} className="text-warn" /> 날짜나 내용이 애매해요. 직접 확인해서 고쳐 주세요.
            </p>
          )}

          {actionable ? (
            <>
              {result.type === 'delay' && (
                <label className="mt-4 block">
                  <span className="mb-1 block text-[13px] font-medium text-body">제출 예정일</span>
                  <input type="date" className={input} value={planned} onChange={(e) => setPlanned(e.target.value)} />
                </label>
              )}
              <h3 className="mt-4 mb-2 text-[15px] font-semibold">어느 집행 건인가요? <span className="font-normal text-body">({sender.name}님의 남은 건)</span></h3>
              {mine.length === 0 ? (
                <p className="text-body">{sender.name}님에게 남은 서류가 없어요. 이력에 메모로만 남길 수 있어요.</p>
              ) : (
                <ul className="space-y-2">
                  {mine.map((e) => (
                    <li key={e.id}>
                      <label className={`flex min-h-11 cursor-pointer flex-wrap items-center gap-2 rounded-xl border px-3 py-2 ${expenseId === e.id ? 'border-brand bg-brand-soft' : 'border-line bg-white'}`}>
                        <input type="radio" name="slack-expense" checked={expenseId === e.id} onChange={() => pickExpense(e.id)} className="h-4 w-4 accent-brand" />
                        <b>{expenseLabel(e)}</b>
                        {matchesHint(e, result.candidate_expense_hint) && (
                          <span className="rounded-full bg-accent-soft px-2 text-[12px] font-semibold text-accent-ink">AI 힌트와 비슷해요</span>
                        )}
                        <span className="text-[13px] text-body">— {openDocs(e).map((d) => d.doc_type).join(', ')}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              )}

              {chosen && (
                <>
                  <h3 className="mt-4 mb-2 text-[15px] font-semibold">어떤 서류인가요?</h3>
                  <div className="flex flex-wrap gap-2">
                    {openDocs(chosen).map((d) => (
                      <label key={d.id} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-line bg-white px-3">
                        <input type="checkbox" checked={docIds.has(d.id)} className="h-4 w-4 accent-brand"
                          onChange={(ev) => setDocIds((cur) => { const n = new Set(cur); if (ev.target.checked) n.add(d.id); else n.delete(d.id); return n })} />
                        {d.doc_type} <StatusText state={d.state} plannedDate={d.planned_date} />
                      </label>
                    ))}
                  </div>
                  {/* 마감을 넘는지는 코드가 계산한다 (SKILL.md: AI는 판단하지 않음) */}
                  {result.type === 'delay' && deadline && planned > deadline && (
                    <p className="mt-3 flex items-center gap-1 rounded-lg bg-[#fff6db] px-3 py-2 text-[14px]">
                      <TriangleAlert aria-hidden size={16} className="text-warn" />
                      사내 마감 {formatDate(deadline)}보다 늦은 날짜예요. 반영하면 '변동 사항'으로 표시돼요.
                    </p>
                  )}
                </>
              )}
            </>
          ) : (
            <p className="mt-3 text-body">예정일이나 제출 상태를 바꿀 내용은 없어요. 처리 이력에 메모로만 남길 수 있어요.</p>
          )}

          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <button onClick={reset} className={BTN}><RotateCcw aria-hidden size={18} /> 다시 하기</button>
            <button onClick={save} disabled={!canSave || busy !== null} className={BTN_PRIMARY}>
              {busy === 'save' ? '반영 중…' : actionable ? (result.type === 'delay' ? '예정일 반영하기' : '제출로 반영하기') : '이력에 메모로 남기기'}
            </button>
          </div>
        </section>
      )}
    </>
  )
}
