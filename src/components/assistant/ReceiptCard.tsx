import type { ReactNode } from 'react'
import { TriangleAlert } from 'lucide-react'
import { missingFields, type ReceiptDraft } from '../../lib/aiReceipt'
import { PAY_METHOD_LABEL, type Person, type Project } from '../../lib/types'

type Props = {
  d: ReceiptDraft
  projects: Project[]
  people: Person[]
  categories: string[]
  onChange: (patch: Partial<ReceiptDraft>) => void
}

const input = 'min-h-11 w-full rounded-lg border border-line bg-white px-3 focus:border-brand'

function Field({ label, children, wide }: { label: string; children: ReactNode; wide?: boolean }) {
  return (
    <label className={`block ${wide ? 'sm:col-span-2' : ''}`}>
      <span className="mb-1 block text-[13px] font-medium text-body">{label}</span>
      {children}
    </label>
  )
}

/** AI가 읽은 영수증 한 장. 모든 칸은 관리자가 고칠 수 있고, 체크한 것만 등록된다 */
export function ReceiptCard({ d, projects, people, categories, onChange }: Props) {
  const missing = missingFields(d)
  const owners = people.filter((p) => !d.project_id || p.project_id === d.project_id)
  return (
    <article className={`rounded-2xl border bg-white/80 p-4 ${d.include ? 'border-white' : 'border-dashed border-line opacity-60'}`}>
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="shrink-0 sm:w-36">
          <a href={d.imageUrl} target="_blank" rel="noreferrer" title="원본 크게 보기">
            <img src={d.imageUrl} alt={d.fileName} className="h-40 w-full rounded-xl object-cover sm:h-48" />
          </a>
          <label className="mt-2 flex min-h-11 cursor-pointer items-center gap-2 font-medium">
            <input type="checkbox" checked={d.include} onChange={(e) => onChange({ include: e.target.checked })} className="h-5 w-5 accent-brand" />
            등록하기
          </label>
        </div>

        <div className="min-w-0 flex-1">
          {d.notes.length > 0 && (
            <ul className="mb-3 flex flex-wrap gap-2">
              {d.notes.map((n) => (
                <li key={n} className="flex items-center gap-1 rounded-full bg-[#fff6db] px-3 py-1 text-[13px]">
                  <TriangleAlert aria-hidden size={14} className="text-warn" /> {n}
                </li>
              ))}
            </ul>
          )}
          <div className="grid gap-3 sm:grid-cols-4">
            <Field label="날짜"><input type="date" className={input} value={d.paid_date} onChange={(e) => onChange({ paid_date: e.target.value })} /></Field>
            <Field label="시간"><input type="time" className={input} value={d.paid_time} onChange={(e) => onChange({ paid_time: e.target.value })} /></Field>
            <Field label="금액(원)"><input inputMode="numeric" className={input} value={d.amount} onChange={(e) => onChange({ amount: e.target.value })} /></Field>
            <Field label="결제방법">
              <select className={input} value={d.pay_method} onChange={(e) => onChange({ pay_method: e.target.value as ReceiptDraft['pay_method'] })}>
                <option value="">골라 주세요</option>
                {Object.entries(PAY_METHOD_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </Field>
            <Field label="거래처" wide><input className={input} value={d.vendor} onChange={(e) => onChange({ vendor: e.target.value })} /></Field>
            <Field label="적요(내용)" wide><input className={input} value={d.description} onChange={(e) => onChange({ description: e.target.value })} /></Field>
            <Field label="과제">
              <select className={input} value={d.project_id} onChange={(e) => onChange({ project_id: e.target.value, owner_id: '' })}>
                <option value="">골라 주세요</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.short_name}</option>)}
              </select>
            </Field>
            <Field label="비목">
              <select className={input} value={d.category} onChange={(e) => onChange({ category: e.target.value })}>
                <option value="">골라 주세요</option>
                {[...new Set([...categories, d.category].filter(Boolean))].map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="세목(있으면)"><input className={input} value={d.sub_category} placeholder="예: 회의비" onChange={(e) => onChange({ sub_category: e.target.value })} /></Field>
            <Field label="사용자">
              <select className={input} value={d.owner_id} onChange={(e) => onChange({ owner_id: e.target.value })}>
                <option value="">선택 안 함</option>
                {owners.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </Field>
          </div>
          {d.include && missing.length > 0 && <p className="mt-2 text-[13px] text-danger">{missing.join(', ')}을(를) 채워 주세요.</p>}
        </div>
      </div>
    </article>
  )
}
