import { useState } from 'react'
import { supabase } from '../lib/supabase'

export type Field = {
  key: string
  label: string
  type: 'text' | 'date' | 'number' | 'select' | 'checkbox' | 'readonly'
  options?: { value: string; label: string }[]
  required?: boolean
  className?: string
}

type Row = Record<string, unknown>

type Props = {
  table: string
  idKey: string
  fields: Field[]
  rows: Row[]
  onChanged: () => void
  canAdd?: boolean
  canDelete?: boolean
  newRow?: Row
}

// 빈 칸은 null로, 숫자 칸은 숫자로 바꿔서 DB에 넣는다
function clean(field: Field, value: unknown): unknown {
  if (field.type === 'checkbox') return Boolean(value)
  if (value === null || value === undefined || String(value).trim() === '') return null
  if (field.type === 'number') return Number(value)
  return String(value).trim()
}

function toPatch(fields: Field[], draft: Row): Row {
  const patch: Row = {}
  for (const f of fields) if (f.type !== 'readonly') patch[f.key] = clean(f, draft[f.key])
  return patch
}

function missingLabel(fields: Field[], draft: Row): string | null {
  const f = fields.find((f) => f.required && clean(f, draft[f.key]) === null)
  return f ? f.label : null
}

function Cell({ field, value, onChange }: { field: Field; value: unknown; onChange: (v: unknown) => void }) {
  const base = 'w-full min-w-0 rounded border border-gray-300 bg-white px-2 py-1 text-sm'
  if (field.type === 'readonly') return <span className="text-sm text-gray-700">{String(value ?? '')}</span>
  if (field.type === 'checkbox')
    return <input type="checkbox" className="h-4 w-4" checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} />
  if (field.type === 'select')
    return (
      <select className={base} value={String(value ?? '')} onChange={(e) => onChange(e.target.value)}>
        <option value="">—</option>
        {field.options?.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    )
  return <input className={base} type={field.type} value={value == null ? '' : String(value)} onChange={(e) => onChange(e.target.value)} />
}

function EditRow({ row, isNew, props }: { row: Row; isNew: boolean; props: Props }) {
  const { table, idKey, fields, onChanged, canDelete } = props
  const [draft, setDraft] = useState<Row>(row)
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const patch = toPatch(fields, draft)
  const dirty = isNew || fields.some((f) => f.type !== 'readonly' && patch[f.key] !== (row[f.key] ?? (f.type === 'checkbox' ? false : null)))

  async function save() {
    if (!supabase) return
    const missing = missingLabel(fields, draft)
    if (missing) return setMessage(`'${missing}'을(를) 입력해 주세요`)
    setBusy(true)
    const { error } = isNew
      ? await supabase.from(table).insert(patch)
      : await supabase.from(table).update(patch).eq(idKey, row[idKey] as string)
    setBusy(false)
    if (error) return setMessage(`저장 실패: ${error.message}`)
    setMessage(isNew ? null : '저장됨')
    if (isNew) setDraft(props.newRow ?? {})
    onChanged()
  }

  async function remove() {
    if (!supabase || !window.confirm('이 줄을 삭제할까요?')) return
    const { error } = await supabase.from(table).delete().eq(idKey, row[idKey] as string)
    if (error) return setMessage(`삭제 실패: ${error.message}`)
    onChanged()
  }

  return (
    <tr className={`border-t border-gray-100 align-middle ${isNew ? 'bg-blue-50/50' : ''}`}>
      {fields.map((f) => (
        <td key={f.key} className={`px-2 py-1.5 ${f.className ?? ''}`}>
          <Cell field={f} value={draft[f.key]} onChange={(v) => { setDraft({ ...draft, [f.key]: v }); setMessage(null) }} />
        </td>
      ))}
      <td className="whitespace-nowrap px-2 py-1.5 text-right">
        <button
          onClick={save}
          disabled={!dirty || busy}
          className="rounded bg-blue-600 px-3 py-1 text-sm text-white disabled:bg-gray-200 disabled:text-gray-500"
        >
          {isNew ? '추가' : '저장'}
        </button>
        {canDelete && !isNew && (
          <button onClick={remove} className="ml-1 rounded px-2 py-1 text-sm text-red-700 hover:bg-red-50">삭제</button>
        )}
        {message && <div className="mt-1 text-xs text-gray-600">{message}</div>}
      </td>
    </tr>
  )
}

export function EditableTable(props: Props) {
  const { fields, rows, idKey, canAdd, newRow } = props
  return (
    <div className="overflow-x-auto rounded border border-gray-200 bg-white">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-left text-gray-600">
          <tr>
            {fields.map((f) => (
              <th key={f.key} className="whitespace-nowrap px-2 py-2 font-medium">
                {f.label}{f.required && <span className="text-red-600"> *</span>}
              </th>
            ))}
            <th className="w-32" />
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <EditRow key={String(r[idKey])} row={r} isNew={false} props={props} />
          ))}
          {canAdd && <EditRow key="__new" row={newRow ?? {}} isNew props={props} />}
        </tbody>
      </table>
    </div>
  )
}
