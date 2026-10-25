import { useId, useState } from 'react'
import { Plus } from 'lucide-react'

type Props = {
  onAdd: (name: string) => void | Promise<void>
  /** 이미 있는 서류 이름 (같은 이름은 다시 넣지 않음) */
  existing: string[]
  /** 입력할 때 고를 수 있게 보여줄 서류 이름 (규칙표에 있는 것들) */
  suggestions?: string[]
}

/** 규칙표에 없는 서류를 관리자가 직접 써서 추가한다 (이례적으로 더 받아야 하는 서류) */
export function AddDocInline({ onAdd, existing, suggestions = [] }: Props) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const listId = useId()
  const value = name.trim()
  const dup = existing.some((d) => d.replace(/\s/g, '') === value.replace(/\s/g, ''))

  async function submit() {
    if (!value || dup || busy) return
    setBusy(true)
    try {
      await onAdd(value)
      setName('')
      setOpen(false)
    } finally {
      setBusy(false)
    }
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)}
        className="inline-flex min-h-8 items-center gap-1 rounded-full border border-dashed border-brand/50 px-3 text-[13px] font-medium text-brand hover:bg-brand-soft">
        <Plus aria-hidden size={14} /> 서류 추가
      </button>
    )
  }
  return (
    <span className="inline-flex items-center gap-1">
      <input autoFocus value={name} onChange={(e) => setName(e.target.value)} list={listId} placeholder="예: 견적서, 사유서"
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.nativeEvent.isComposing) { e.preventDefault(); submit() }
          if (e.key === 'Escape') setOpen(false)
        }}
        aria-label="추가할 서류 이름" className="min-h-8 w-36 rounded-lg border border-brand/50 bg-white px-2 text-[13px] focus:border-brand" />
      <datalist id={listId}>
        {suggestions.filter((s) => !existing.includes(s)).map((s) => <option key={s} value={s} />)}
      </datalist>
      <button type="button" onClick={submit} disabled={!value || dup || busy}
        className="min-h-8 rounded-lg bg-brand px-2 text-[13px] font-semibold text-white disabled:bg-muted">추가</button>
      <button type="button" onClick={() => { setOpen(false); setName('') }} className="min-h-8 rounded-lg px-2 text-[13px] text-body hover:bg-white">취소</button>
      {dup && <span className="text-[12px] text-danger">이미 있어요</span>}
    </span>
  )
}
