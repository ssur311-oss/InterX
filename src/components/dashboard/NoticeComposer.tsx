import { useEffect, useState } from 'react'
import { Copy, Loader2, Send, Sparkles } from 'lucide-react'
import { draftNotice, openExpensesOf } from '../../lib/aiNotice'
import { todaySeoul } from '../../lib/date'
import { lastNoticeAt, noticeCount, noticeTemplate, sendNotice } from '../../lib/notice'
import type { Person } from '../../lib/types'
import type { DashExpense, ProjectWithDeadline } from '../../lib/useDashboard'
import { BTN, BTN_PRIMARY } from '../ui'

export type ComposerMood = 'thinking' | 'speaking' | 'success' | 'error'

type Props = {
  person: Person
  expenses: DashExpense[]
  projects: ProjectWithDeadline[]
  onSent: (text: string) => void
  /** 체크메이트 모니 화면에서 모니 표정을 바꿀 때 */
  onMood?: (s: ComposerMood, ms?: number) => void
  minHeight?: number
}

/**
 * 한 사람에게 보낼 슬랙 메시지: 규칙 문장 → (선택) AI로 다듬기 → 관리자가 고치고 → 복사·보내기 (RULE.md 6장)
 * 대시보드 팝업과 체크메이트 모니 화면이 같이 쓴다
 */
export function NoticeComposer({ person, expenses, projects, onSent, onMood, minHeight = 280 }: Props) {
  const mine = openExpensesOf(person.id, expenses)
  const ids = mine.map((e) => e.id)
  const [last, setLast] = useState<string | null | undefined>(undefined)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [polishing, setPolishing] = useState(false)

  // 이전 발송 기록을 보고 통보/재통보 문장을 고른다
  useEffect(() => {
    setLast(undefined)
    lastNoticeAt(mine.map((e) => e.id)).then((at) => {
      setLast(at)
      setText(noticeTemplate(person.name, mine, projects, Boolean(at)))
    })
    // 사람을 고른 순간의 내용으로 한 번만 만든다 (체크로 목록이 바뀌어도 고치던 문장을 덮어쓰지 않게)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [person.id])

  const noSlack = !person.slack_user_id
  const hoursSince = last ? (Date.now() - Date.parse(last)) / 3_600_000 : null

  async function send() {
    setBusy(true)
    setError(null)
    try {
      await sendNotice(person.id, text, ids, Boolean(last))
      setLast(new Date().toISOString())
      onSent(`${person.name}님에게 슬랙 메시지를 보냈어요.`)
      onMood?.('success', 2600)
    } catch (e) {
      setError((e as Error).message)
      onMood?.('error', 3000)
    }
    setBusy(false)
  }

  // 지금 문장을 살려서 AI가 SKILL.md 작업 2 규칙대로 다듬는다. 결과는 미리보기에만 넣고, 보내기는 관리자가 누른다
  async function polish() {
    setPolishing(true)
    setError(null)
    onMood?.('thinking')
    try {
      const round = await noticeCount(ids)
      setText(await draftNotice({ name: person.name, mine, projects, today: todaySeoul(), round, draft: text }))
      setCopied(false)
      onMood?.('speaking', 900)
    } catch (e) {
      setError((e as Error).message)
      onMood?.('error', 3000)
    }
    setPolishing(false)
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
    } catch {
      setError('복사하지 못했어요. 글을 직접 선택해서 복사해 주세요.')
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <p className="text-body">
        {person.role} · 남은 서류가 있는 집행 {mine.length}건 · {last ? '재통보' : '첫 통보'}
        {hoursSince !== null && ` · 마지막 발송 ${Math.floor(hoursSince)}시간 전`}
      </p>
      <label className="mt-3 flex min-h-0 flex-1 flex-col">
        <span className="mb-2 font-medium">보낼 메시지 <span className="text-[13px] font-normal text-body">(자유롭게 고쳐도 돼요)</span></span>
        <textarea value={last === undefined ? '불러오는 중…' : text} onChange={(e) => { setText(e.target.value); setCopied(false) }}
          disabled={last === undefined || polishing} style={{ minHeight }}
          className="flex-1 resize-none rounded-xl border border-line bg-white/85 p-4 leading-relaxed focus:border-brand" />
      </label>

      {noSlack && <p className="mt-3 text-danger">이 사람의 슬랙 ID가 없어요. 설정 &gt; 사람에서 넣으면 보낼 수 있어요. 지금은 복사해서 직접 보낼 수 있어요.</p>}
      {error && <p className="mt-3 text-danger">{error}</p>}

      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <button onClick={polish} disabled={polishing || busy || last === undefined || !mine.length} className={`${BTN} mr-auto`}>
          {polishing ? <Loader2 aria-hidden size={18} className="animate-spin" /> : <Sparkles aria-hidden size={18} className="text-accent" />}
          {polishing ? '다듬는 중…' : 'AI로 다듬기'}
        </button>
        <button onClick={copy} disabled={!text} className={BTN}>
          <Copy aria-hidden size={18} /> {copied ? '복사했어요' : '복사'}
        </button>
        <button onClick={send} disabled={busy || polishing || noSlack || !text.trim() || last === undefined} className={BTN_PRIMARY}>
          <Send aria-hidden size={18} /> {busy ? '보내는 중…' : '슬랙으로 보내기'}
        </button>
      </div>
    </div>
  )
}
