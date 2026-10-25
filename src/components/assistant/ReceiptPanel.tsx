import { useEffect, useState, type ChangeEvent } from 'react'
import { Link } from 'react-router-dom'
import { FileText, ImagePlus, Loader2, RotateCcw, Sparkles, X } from 'lucide-react'
import { docTypesOf, isPdf, MAX_PDF_MB, missingFields, readReceipts, registerReceipts, toDraft, type ReceiptDraft } from '../../lib/aiReceipt'
import { useDashboard } from '../../lib/useDashboard'
import { loadUploadContext, type UploadContext } from '../../lib/upload/register'
import { BTN, BTN_PRIMARY } from '../ui'
import type { MoniState } from './AiAssistantCharacter'
import { ReceiptCard } from './ReceiptCard'

type Shot = { file: File; name: string; url: string; pdf: boolean }
const MAX = 8

/**
 * 증빙 서류 올리기: 사진·PDF → AI가 무슨 서류인지 읽기 → 관리자가 확인 →
 * 기존 집행 건의 서류 칸에 체크하거나, 새 집행 건으로 등록 (엑셀 등록과 같은 규칙)
 */
// 모니 표정은 보여주기만 한다. 저장은 이 화면의 [처리] 버튼으로만
export function ReceiptPanel({ onMood }: { onMood?: (s: MoniState, ms?: number) => void }) {
  const [ctx, setCtx] = useState<UploadContext | null>(null)
  // 기존 건에 붙일 때 후보로 쓸 집행 건(아직 안 낸 서류 포함)
  const { expenses, reload } = useDashboard()
  const [shots, setShots] = useState<Shot[]>([])
  const [drafts, setDrafts] = useState<ReceiptDraft[] | null>(null)
  const [markPaid, setMarkPaid] = useState(true)
  const [busy, setBusy] = useState<'read' | 'save' | null>(null)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  useEffect(() => {
    loadUploadContext().then(setCtx).catch((e: Error) => setMsg({ ok: false, text: `설정을 읽지 못했어요: ${e.message}` }))
  }, [])

  function onPick(e: ChangeEvent<HTMLInputElement>) {
    const all = [...(e.target.files ?? [])].filter((f) => f.type.startsWith('image/') || isPdf(f))
    e.target.value = ''
    // PDF는 줄이지 않고 그대로 보내므로 너무 큰 파일은 뺀다
    const tooBig = all.filter((f) => isPdf(f) && f.size > MAX_PDF_MB * 1024 * 1024)
    const files = all.filter((f) => !tooBig.includes(f))
    setMsg(tooBig.length ? { ok: false, text: `${tooBig.map((f) => f.name).join(', ')}: PDF는 ${MAX_PDF_MB}MB 이하만 올릴 수 있어요.` } : null)
    setShots((cur) => [...cur, ...files.map((file) => ({ file, name: file.name, url: URL.createObjectURL(file), pdf: isPdf(file) }))].slice(0, MAX))
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
      const { added, attached, risks } = await registerReceipts(chosen, ctx, markPaid, expenses)
      const parts = [attached && `서류 ${attached}개를 제출로 체크했어요.`, added && `새 집행 ${added}건을 등록했어요.`, '파일은 보관함에 표준 이름으로 저장했어요.', risks && `위험 확인 필요 ${risks}개가 붙었어요.`]
      setMsg({ ok: true, text: parts.filter(Boolean).join(' ') })
      reload()
      onMood?.('success', 2600)
      reset()
      setCtx(await loadUploadContext())
    } catch (e) {
      setMsg({ ok: false, text: `처리 중 문제가 생겼어요: ${(e as Error).message}` })
      onMood?.('error', 3000)
    }
    setBusy(null)
  }

  const categories = [...new Set(ctx?.rules.map((r) => r.category) ?? [])]
  const docTypes = ctx ? docTypesOf(ctx) : []
  const hasNew = chosen.some((d) => d.mode === 'new')

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
            <b className="text-lg">증빙 서류 올리기 (사진·PDF)</b>
            <span className="text-body">영수증·세금계산서는 물론 회의록·검수조서·거래명세서·참석자 명단·출장결과보고서 등 무엇이든요.</span>
            <span className="text-[13px] text-body">파일 하나 = 서류 하나 · 한 번에 {MAX}개까지 · PDF는 {MAX_PDF_MB}MB 이하</span>
            <input type="file" accept="image/*,application/pdf,.pdf" multiple className="sr-only" onChange={onPick} />
          </label>
          {shots.length > 0 && (
            <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {shots.map((s, i) => (
                <li key={s.url} className="relative overflow-hidden rounded-xl bg-white shadow-sm">
                  {s.pdf ? (
                    <span className="flex h-28 w-full items-center justify-center bg-brand-soft"><FileText aria-hidden size={32} className="text-brand" /></span>
                  ) : (
                    <img src={s.url} alt={s.name} className="h-28 w-full object-cover" />
                  )}
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
              {busy === 'read' ? '모니가 읽는 중…' : `AI로 읽기${shots.length ? ` (${shots.length}개)` : ''}`}
            </button>
          </div>
        </>
      )}

      {drafts && ctx && (
        <>
          <p className="mb-3 text-body">AI가 읽은 내용이에요. 서류마다 <b className="text-ink">기존 집행 건에 체크</b>할지 <b className="text-ink">새 집행 건으로 등록</b>할지 고르고, 노란 표시는 꼭 확인해 주세요.</p>
          <div className="space-y-3">
            {drafts.map((d, i) => (
              <ReceiptCard key={d.key} d={d} projects={ctx.projects} people={ctx.people} categories={categories} docTypes={docTypes} expenses={expenses}
                onChange={(patch) => setDrafts((cur) => cur!.map((x, n) => (n === i ? { ...x, ...patch } : x)))} />
            ))}
          </div>
          <div className="sticky bottom-0 mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white/90 p-3 backdrop-blur">
            {hasNew ? (
              <label className="flex min-h-11 cursor-pointer items-center gap-2">
                <input type="checkbox" checked={markPaid} onChange={(e) => setMarkPaid(e.target.checked)} className="h-5 w-5 accent-brand" />
                새로 등록하는 건은 이 파일을 <b>결제 증빙(카드전표·세금계산서)</b>으로 제출 처리
              </label>
            ) : <span />}
            <div className="flex gap-2">
              <button onClick={reset} className={BTN}><RotateCcw aria-hidden size={18} /> 처음부터</button>
              <button onClick={save} disabled={!chosen.length || blocked || busy !== null} className={BTN_PRIMARY}>
                {busy === 'save' ? '처리 중…' : `${chosen.length}개 처리하기`}
              </button>
            </div>
          </div>
        </>
      )}
    </>
  )
}
