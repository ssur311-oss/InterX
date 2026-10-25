import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { Loader2, Send } from 'lucide-react'
import { askConsult, buildConsultContext, type ChatMsg } from '../../lib/aiConsult'
import { loadUploadContext } from '../../lib/upload/register'
import { BTN_PRIMARY } from '../ui'
import type { MoniState } from './AiAssistantCharacter'

const EXAMPLES = [
  '영수증을 잃어버렸대요. 어떻게 처리하죠?',
  '같은 가게에서 카드 결제를 두 번 나눠서 했대요.',
  '출장이 하루 늘었는데 숙박비는 어떤 서류가 필요해요?',
  '회의비로 커피만 사도 되나요?',
]

const GREETING: ChatMsg = {
  role: 'assistant',
  text: '안녕하세요, 모니예요! 사업비 증빙에서 애매한 상황을 말해 주시면, 확인할 것과 받아야 할 서류를 정리해 드릴게요.',
}

/** 모니와 대화하며 사업비 상황 상담. 답은 참고용이고 저장·발송은 하지 않는다 (RULE.md 0장) */
export function ConsultPanel({ onMood }: { onMood?: (s: MoniState, ms?: number) => void }) {
  const [context, setContext] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMsg[]>([GREETING])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bottom = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadUploadContext()
      .then((ctx) => setContext(buildConsultContext(ctx)))
      .catch((e: Error) => setError(`규칙표를 읽지 못했어요: ${e.message}`))
  }, [])

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, busy])

  async function ask(question: string) {
    const q = question.trim()
    if (!q || busy || !context) return
    const next: ChatMsg[] = [...messages, { role: 'user', text: q }]
    setMessages(next)
    setInput('')
    setError(null)
    setBusy(true)
    onMood?.('thinking')
    try {
      // 첫 인사는 화면용이라 AI에는 보내지 않는다
      const answer = await askConsult(next.filter((m) => m !== GREETING), context)
      setMessages((cur) => [...cur, { role: 'assistant', text: answer }])
      onMood?.('speaking', 900)
    } catch (e) {
      setError((e as Error).message)
      onMood?.('error', 3000)
    }
    setBusy(false)
  }

  function onKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    // Enter = 보내기, Shift+Enter = 줄바꿈 (한글 조합 중에는 보내지 않음)
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      ask(input)
    }
  }

  return (
    <div className="flex h-full min-h-[420px] flex-col">
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1" aria-live="polite">
        {messages.map((m, i) => (
          <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
            {/* 글은 React 텍스트로만 넣는다 (HTML로 해석하지 않음) */}
            <p className={`max-w-[85%] rounded-2xl px-4 py-3 leading-relaxed whitespace-pre-wrap ${
              m.role === 'user' ? 'rounded-br-md bg-brand text-white' : 'rounded-bl-md bg-white/90 text-ink shadow-sm'}`}>
              {m.role === 'assistant' && <span className="mb-1 block text-[12px] font-semibold text-accent-ink">모니</span>}
              {m.text}
            </p>
          </div>
        ))}
        {busy && (
          <div className="flex items-center gap-2 text-body"><Loader2 aria-hidden size={16} className="animate-spin" /> 모니가 생각하는 중…</div>
        )}
        <div ref={bottom} />
      </div>

      {messages.length === 1 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {EXAMPLES.map((q) => (
            <button key={q} onClick={() => ask(q)} disabled={!context || busy}
              className="min-h-11 rounded-full border border-accent-line bg-white/80 px-4 text-[14px] text-ink hover:bg-white disabled:opacity-50">
              {q}
            </button>
          ))}
        </div>
      )}

      {error && <p className="mt-2 text-danger">{error}</p>}
      <div className="mt-3 flex items-end gap-2">
        <textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={onKey} rows={2} maxLength={4000}
          placeholder="상황을 적어 주세요 (Enter 보내기, Shift+Enter 줄바꿈)" aria-label="모니에게 질문"
          className="min-h-12 flex-1 resize-none rounded-xl border border-line bg-white/85 px-4 py-3 focus:border-brand" />
        <button onClick={() => ask(input)} disabled={!input.trim() || busy || !context} className={BTN_PRIMARY}>
          <Send aria-hidden size={18} /> 보내기
        </button>
      </div>
      <p className="mt-2 text-[13px] text-body">모니의 답은 참고용이에요. 최종 판단은 협약·전문기관 지침을 확인한 뒤 해 주세요.</p>
    </div>
  )
}
