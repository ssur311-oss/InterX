import { useEffect, useState } from 'react'
import { Copy, Send, X } from 'lucide-react'
import { lastNoticeAt, noticeTemplate, RE_NOTICE_HOURS, sendNotice } from '../../lib/notice'
import type { Person } from '../../lib/types'
import type { DashExpense, ProjectWithDeadline } from '../../lib/useDashboard'
import { BTN, BTN_PRIMARY } from '../ui'

type Props = {
  person: Person
  expenses: DashExpense[]
  projects: ProjectWithDeadline[]
  onClose: () => void
  onSent: (text: string) => void
}

/** 사람 한 명에게 보낼 슬랙 메시지: 미리보기 → 관리자가 고치고 → 보내기 (RULE.md 6장) */
export function PersonNotice({ person, expenses, projects, onClose, onSent }: Props) {
  const mine = expenses.filter((e) => e.owner_id === person.id && e.required_docs.some((d) => d.status !== 'submitted'))
  const ids = mine.map((e) => e.id)
  const [last, setLast] = useState<string | null | undefined>(undefined)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // 이전 발송 기록을 보고 통보/재통보 문장을 고른다
  useEffect(() => {
    lastNoticeAt(mine.map((e) => e.id)).then((at) => {
      setLast(at)
      setText(noticeTemplate(person.name, mine, projects, Boolean(at)))
    })
    // 창을 연 순간의 내용으로 한 번만 만든다 (체크로 목록이 바뀌어도 고치던 문장을 덮어쓰지 않게)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [person.id])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const hoursSince = last ? (Date.now() - Date.parse(last)) / 3_600_000 : Infinity
  // 재통보는 마지막 발송 24시간 뒤부터, 같은 사람에게 하루 2번 이상 금지 (RULE.md 6장)
  const tooSoon = hoursSince < RE_NOTICE_HOURS
  const noSlack = !person.slack_user_id

  async function send() {
    setBusy(true)
    setError(null)
    try {
      await sendNotice(person.id, text, ids, Boolean(last))
      onSent(`${person.name}님에게 슬랙 메시지를 보냈어요.`)
    } catch (e) {
      setError((e as Error).message)
    }
    setBusy(false)
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
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-ink/20 p-5 backdrop-blur-sm" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="notice-title" onClick={(e) => e.stopPropagation()}
        className="glass-strong animate-pop flex max-h-full w-full max-w-2xl flex-col rounded-3xl p-6">
        <header className="flex items-start justify-between gap-4">
          <div>
            <h2 id="notice-title" className="text-2xl font-bold">{person.name}님에게 {last ? '재통보' : '통보'}</h2>
            <p className="mt-1 text-body">
              {person.role} · 남은 서류가 있는 집행 {mine.length}건
              {last && ` · 마지막 발송 ${Math.floor(hoursSince)}시간 전`}
            </p>
          </div>
          <button onClick={onClose} aria-label="닫기" className="flex h-11 w-11 items-center justify-center rounded-lg text-body hover:bg-white/70">
            <X size={20} aria-hidden />
          </button>
        </header>

        <label className="mt-4 flex min-h-0 flex-1 flex-col">
          <span className="mb-2 font-medium">보낼 메시지 <span className="text-[13px] font-normal text-body">(자유롭게 고쳐도 돼요)</span></span>
          <textarea value={last === undefined ? '불러오는 중…' : text} onChange={(e) => { setText(e.target.value); setCopied(false) }}
            disabled={last === undefined}
            className="min-h-[280px] flex-1 resize-none rounded-xl border border-line bg-white/85 p-4 leading-relaxed focus:border-brand" />
        </label>

        {noSlack && <p className="mt-3 text-danger">이 사람의 슬랙 ID가 없어요. 설정 &gt; 사람에서 넣으면 보낼 수 있어요. 지금은 복사해서 직접 보낼 수 있어요.</p>}
        {tooSoon && <p className="mt-3 text-body">마지막 발송 후 {RE_NOTICE_HOURS}시간이 지나야 다시 보낼 수 있어요.</p>}
        {error && <p className="mt-3 text-danger">{error}</p>}

        <footer className="mt-4 flex flex-wrap justify-end gap-2">
          <button onClick={copy} disabled={!text} className={BTN}>
            <Copy aria-hidden size={18} /> {copied ? '복사했어요' : '복사'}
          </button>
          <button onClick={send} disabled={busy || noSlack || tooSoon || !text.trim() || last === undefined} className={BTN_PRIMARY}>
            <Send aria-hidden size={18} /> {busy ? '보내는 중…' : '슬랙으로 보내기'}
          </button>
        </footer>
      </div>
    </div>
  )
}
