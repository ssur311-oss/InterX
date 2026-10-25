import { useState } from 'react'
import { openExpensesOf } from '../../lib/aiNotice'
import { useDashboard } from '../../lib/useDashboard'
import { NoticeComposer } from '../dashboard/NoticeComposer'
import type { MoniState } from './AiAssistantCharacter'

/** 통보 문장 다듬기: 사람 고르기 → 규칙 문장 → AI로 다듬기 → 고쳐서 복사·보내기 */
export function NoticePanel({ onMood }: { onMood?: (s: MoniState, ms?: number) => void }) {
  const { expenses, people, projects, reload } = useDashboard()
  const [personId, setPersonId] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  // 남은 서류가 많은 사람부터
  const candidates = people
    .map((p) => ({ p, n: openExpensesOf(p.id, expenses).length }))
    .filter((x) => x.n > 0)
    .sort((a, b) => b.n - a.n)
  const person = people.find((p) => p.id === personId)

  return (
    <div className="flex h-full min-h-[420px] flex-col">
      {msg && <div role="status" className="mb-3 rounded-xl border-l-4 border-l-ok bg-white/80 px-4 py-3">{msg}</div>}
      <label className="block">
        <span className="mb-1 block text-[13px] font-medium text-body">받는 사람 <span className="font-normal">(남은 서류가 있는 사람만)</span></span>
        <select value={personId} onChange={(e) => { setPersonId(e.target.value); setMsg(null) }}
          className="min-h-11 w-full rounded-lg border border-line bg-white px-3 focus:border-brand sm:w-72">
          <option value="">골라 주세요</option>
          {candidates.map(({ p, n }) => <option key={p.id} value={p.id}>{p.name} · 남은 집행 {n}건</option>)}
        </select>
      </label>
      {person ? (
        <div className="mt-4 flex min-h-0 flex-1 flex-col">
          <NoticeComposer key={person.id} person={person} expenses={expenses} projects={projects} onMood={onMood} minHeight={220}
            onSent={(t) => { setMsg(t); reload() }} />
        </div>
      ) : (
        <p className="mt-6 text-body">받는 사람을 고르면 남은 서류로 기본 문장을 만들어 드려요. 그다음 <b className="text-ink">AI로 다듬기</b>를 눌러 보세요.</p>
      )}
    </div>
  )
}
