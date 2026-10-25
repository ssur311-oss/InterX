import { useEffect, useState, type ChangeEvent } from 'react'
import { Link } from 'react-router-dom'
import { ImagePlus, Loader2, RotateCcw, Sparkles, X } from 'lucide-react'
import { missingFields, readReceipts, registerReceipts, toDraft, type ReceiptDraft } from '../../lib/aiReceipt'
import { loadUploadContext, type UploadContext } from '../../lib/upload/register'
import { BTN, BTN_PRIMARY } from '../ui'
import type { MoniState } from './AiAssistantCharacter'
import { ReceiptCard } from './ReceiptCard'

type Shot = { file: File; name: string; url: string }
const MAX = 8

/** 영수증 사진 → AI 읽기 → 관리자 확인·수정 → [등록] (엑셀 등록과 같은 규칙으로 필요 서류 생성) */
// 모니 표정은 보여주기만 한다. 저장은 이 화면의 [등록] 버튼으로만
export function ReceiptPanel({ onMood }: { onMood?: (s: MoniState, ms?: number) => void }) {
  const [ctx, setCtx] = useState<UploadContext | null>(null)
  const [shots, setShots] = useState<Shot[]>([])
  const [drafts, setDrafts] = useState<ReceiptDraft[] | null>(null)
  const [markPaid, setMarkPaid] = useState(true)
  const [busy, setBusy] = useState<'read' | 'save' | null>(null)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  useEffect(() => {
    loadUploadContext().then(setCtx).catch((e: Error) => setMsg({ ok: false, text: `설정을 읽지 못했어요: ${e.message}` }))
  }, [])

  function onPick(e: ChangeEvent<HTMLInputElement>) {
    const files = [...(e.target.files ?? [])].filter((f) => f.type.startsWith('image/'))
    e.target.value = ''
    setMsg(null)
    setShots((cur) => [...cur, ...files.map((file) => ({ file, name: file.name, url: URL.createObjectURL(file) }))].slice(0, MAX))
  }

  function reset() {
    shots.forEach((s) => URL.revokeObjectURL(s.url))
    setShots([])
    setDrafts(null)
  }

  async function read() {
    if (!ctx) return
    setBusy('read')
    setMsg(null)
    onMood?.('thinking')
    try {
      const result = await readReceipts(shots.map((s) => s.file), ctx)
      setDrafts(shots.map((s, i) => toDraft(result.find((r) => r.image_index === i), s, `${i}-${s.name}`, ctx)))
      onMood?.('speaking', 900)
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message })
      onMood?.('error', 3000)
    }
    setBusy(null)
  }

  const chosen = drafts?.filter((d) => d.include) ?? []
  const blocked = chosen.some((d) => missingFields(d).length > 0)

  async function save() {
    if (!ctx || !chosen.length || blocked) return
    setBusy('save')
    try {
      const { count, risks } = await registerReceipts(chosen, ctx, markPaid)
      setMsg({ ok: true, text: `집행 ${count}건을 등록했어요.${risks ? ` 위험 확인 필요 ${risks}개가 붙었어요.` : ''}` })
      onMood?.('success', 2600)
      reset()
      setCtx(await loadUploadContext())
    } catch (e) {
      setMsg({ ok: false, text: `등록 중 문제가 생겼어요: ${(e as Error).message}` })
      onMood?.('error', 3000)
    }
    setBusy(null)
  }

  const categories = [...new Set(ctx?.rules.map((r) => r.category) ?? [])]

  return (
    <>
      {msg && (
        <div role="status" className={`mb-4 rounded-xl border-l-4 bg-white/80 px-4 py-3 ${msg.ok ? 'border-l-ok' : 'border-l-danger'}`}>
          {msg.text}
          {msg.ok && <Link to="/checklist" className="ml-2 font-semibold text-brand underline">체크리스트에서 보기</Link>}
        </div>
      )}

      {!drafts && (
        <>
          <label className="flex min-h-40 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-brand/40 bg-white/60 p-6 text-center hover:bg-white">
            <ImagePlus aria-hidden size={36} className="text-brand" />
            <b className="text-lg">영수증·세금계산서 사진 올리기</b>
            <span className="text-body">사진 한 장 = 집행 한 건으로 읽어요. 한 번에 {MAX}장까지 (JPG·PNG)</span>
            <input type="file" accept="image/*" multiple className="sr-only" onChange={onPick} />
          </label>
          {shots.length > 0 && (
            <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {shots.map((s, i) => (
                <li key={s.url} className="relative overflow-hidden rounded-xl bg-white shadow-sm">
                  <img src={s.url} alt={s.name} className="h-28 w-full object-cover" />
                  <p className="truncate px-2 py-1 text-[13px] text-body">{s.name}</p>
                  <button onClick={() => { URL.revokeObjectURL(s.url); setShots((cur) => cur.filter((_, n) => n !== i)) }} aria-label={`${s.name} 빼기`}
                    className="absolute top-1 right-1 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-body hover:text-ink">
                    <X aria-hidden size={16} />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4 flex flex-wrap items-center justify-end gap-3">
            <span className="text-[13px] text-body">AI가 읽은 내용은 다음 화면에서 확인·수정한 뒤에만 저장돼요.</span>
            <button onClick={read} disabled={!shots.length || !ctx || busy !== null} className={BTN_PRIMARY}>
              {busy === 'read' ? <Loader2 aria-hidden size={18} className="animate-spin" /> : <Sparkles aria-hidden size={18} />}
              {busy === 'read' ? '모니가 읽는 중…' : `AI로 읽기${shots.length ? ` (${shots.length}장)` : ''}`}
            </button>
          </div>
        </>
      )}

      {drafts && ctx && (
        <>
          <p className="mb-3 text-body">AI가 읽은 내용이에요. 틀린 곳을 고치고, 노란 표시는 꼭 확인해 주세요.</p>
          <div className="space-y-3">
            {drafts.map((d, i) => (
              <ReceiptCard key={d.key} d={d} projects={ctx.projects} people={ctx.people} categories={categories}
                onChange={(patch) => setDrafts((cur) => cur!.map((x, n) => (n === i ? { ...x, ...patch } : x)))} />
            ))}
          </div>
          <div className="sticky bottom-0 mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white/90 p-3 backdrop-blur">
            <label className="flex min-h-11 cursor-pointer items-center gap-2">
              <input type="checkbox" checked={markPaid} onChange={(e) => setMarkPaid(e.target.checked)} className="h-5 w-5 accent-brand" />
              이 사진을 <b>결제 증빙(카드전표·세금계산서)</b>으로 제출 처리
            </label>
            <div className="flex gap-2">
              <button onClick={reset} className={BTN}><RotateCcw aria-hidden size={18} /> 처음부터</button>
              <button onClick={save} disabled={!chosen.length || blocked || busy !== null} className={BTN_PRIMARY}>
                {busy === 'save' ? '등록 중…' : `${chosen.length}건 등록하기`}
              </button>
            </div>
          </div>
        </>
      )}
    </>
  )
}
