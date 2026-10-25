import { useRef, useState } from 'react'
import { Check, FileText, Loader2, Paperclip } from 'lucide-react'
import { formatDate, formatWon } from '../../lib/format'
import { PAY_METHOD_LABEL } from '../../lib/types'
import type { DashDoc, DashExpense } from '../../lib/useDashboard'
import { AddDocInline } from '../AddDocInline'
import { StatusText } from '../StatusBadge'

type Props = {
  expense: DashExpense
  projectName: string
  leaving?: boolean
  onToggle: (doc: DashDoc, checked: boolean) => void
  /** 서류 칸에 파일을 올리거나 끌어다 놓았을 때 (없으면 파일 기능을 숨김) */
  onFile?: (doc: DashDoc, file: File) => Promise<void>
  onOpen?: (doc: DashDoc) => void
  /** 규칙표에 없는 서류를 직접 추가 (없으면 버튼을 숨김) */
  onAddDoc?: (name: string) => Promise<void>
  docSuggestions?: string[]
}

/** 집행 건 하나 = 카드 하나. 필요한 서류마다 체크 칸이 있다 */
// 위험 확인 태그는 AI 기능을 붙일 때 다시 넣는다
export function ExpenseCard({ expense: e, projectName, leaving, onToggle, onFile, onOpen, onAddDoc, docSuggestions }: Props) {
  const done = e.required_docs.filter((d) => d.status === 'submitted').length
  const total = e.required_docs.length

  return (
    <article className={`glass rounded-2xl p-5 ${leaving ? 'animate-leave' : ''}`}>
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
        <div className="min-w-0">
          <h3 className="text-lg font-semibold">{e.description || '(적요 없음)'}</h3>
          <p className="mt-1 text-[13px] text-body">
            <b className="text-ink">{projectName}</b> · {e.category}{e.sub_category && ` / ${e.sub_category}`} · {PAY_METHOD_LABEL[e.pay_method]}
            {e.vendor && ` · ${e.vendor}`} · {e.people?.name ?? '담당자 없음'} · {formatDate(e.paid_at)}
          </p>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold tabular-nums">{formatWon(e.amount)}</div>
          <div className="text-[13px] text-body">
            서류 <b className={done === total ? 'text-ok' : 'text-ink'}>{done}/{total}</b>
          </div>
        </div>
      </div>

      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[rgb(17_24_39/0.06)]" aria-hidden>
        <span className="block h-full rounded-full bg-ok transition-[width] duration-300" style={{ width: `${total ? (done / total) * 100 : 0}%` }} />
      </div>

      <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {e.required_docs.map((d) => {
          const checked = d.status === 'submitted'
          return (
            <li key={d.id}>
              <DocSlot d={d} checked={checked} onToggle={() => onToggle(d, !checked)}
                onFile={onFile ? (f) => onFile(d, f) : undefined} onOpen={onOpen && d.file_path ? () => onOpen(d) : undefined} />
            </li>
          )
        })}
      </ul>
      {onAddDoc && (
        <div className="mt-3">
          <AddDocInline existing={e.required_docs.map((d) => d.doc_type)} suggestions={docSuggestions} onAdd={onAddDoc} />
        </div>
      )}
    </article>
  )
}

type SlotProps = {
  d: DashDoc
  checked: boolean
  onToggle: () => void
  onFile?: (file: File) => Promise<void>
  onOpen?: () => void
}

/** 서류 칸 하나: 눌러서 체크, 📎로 파일 올리기, 파일을 끌어다 놓기, 보관한 파일 열기 */
function DocSlot({ d, checked, onToggle, onFile, onOpen }: SlotProps) {
  const picker = useRef<HTMLInputElement>(null)
  const [over, setOver] = useState(false)
  const [busy, setBusy] = useState(false)

  async function take(file: File | undefined) {
    if (!file || !onFile) return
    setBusy(true)
    try {
      await onFile(file)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      onDragOver={onFile ? (ev) => { ev.preventDefault(); setOver(true) } : undefined}
      onDragLeave={() => setOver(false)}
      onDrop={onFile ? (ev) => { ev.preventDefault(); setOver(false); take(ev.dataTransfer.files[0]) } : undefined}
      className={`flex min-h-14 items-stretch rounded-xl border transition-colors ${
        over ? 'border-brand bg-brand-soft' : checked ? 'border-ok/30 bg-ok/10' : 'border-white/90 bg-white/70 hover:border-brand/40 hover:bg-white'
      }`}
    >
      <button role="checkbox" aria-checked={checked} onClick={onToggle} className="flex min-w-0 flex-1 items-center gap-3 px-3 text-left">
        <span aria-hidden className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 ${
          checked ? 'border-ok bg-ok text-white' : 'border-muted bg-white'
        }`}>
          {checked && <Check size={16} strokeWidth={3} />}
        </span>
        <span className="min-w-0">
          <span className="block truncate font-medium">{d.doc_type}</span>
          {over ? <span className="text-[13px] font-medium text-brand">여기에 놓으면 보관해요</span> : <StatusText state={d.state} plannedDate={d.planned_date} />}
        </span>
      </button>
      {onOpen && (
        <button onClick={onOpen} title={d.renamed_file_name ?? '보관한 파일 열기'} aria-label={`${d.doc_type} 파일 열기`}
          className="flex w-11 shrink-0 items-center justify-center text-brand hover:bg-white/70">
          <FileText aria-hidden size={18} />
        </button>
      )}
      {onFile && (
        <>
          <button onClick={() => picker.current?.click()} disabled={busy} title="파일 올리기 (끌어다 놓아도 돼요)" aria-label={`${d.doc_type} 파일 올리기`}
            className="flex w-11 shrink-0 items-center justify-center rounded-r-xl text-body hover:bg-white/70 hover:text-ink">
            {busy ? <Loader2 aria-hidden size={18} className="animate-spin" /> : <Paperclip aria-hidden size={18} />}
          </button>
          <input ref={picker} type="file" accept="image/*,application/pdf,.pdf,.hwp,.hwpx,.doc,.docx,.xlsx" className="sr-only"
            onChange={(ev) => { take(ev.target.files?.[0]); ev.target.value = '' }} />
        </>
      )}
    </div>
  )
}
