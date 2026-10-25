import type { ReactNode } from 'react'
import { FileText, TriangleAlert } from 'lucide-react'
import { missingFields, type DraftMode, type ReceiptDraft } from '../../lib/aiReceipt'
import { PAY_METHOD_LABEL, type Person, type Project } from '../../lib/types'
import type { DashExpense } from '../../lib/useDashboard'
import { AttachPicker } from './AttachPicker'

type Props = {
  d: ReceiptDraft
  projects: Project[]
  people: Person[]
  categories: string[]
  docTypes: string[]
  expenses: DashExpense[]
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

const MODES: { key: DraftMode; label: string }[] = [
  { key: 'attach', label: '기존 집행 건에 체크' },
  { key: 'new', label: '새 집행 건 등록' },
]

/** AI가 읽은 증빙 파일 하나. 기존 건의 서류로 체크하거나, 새 집행 건으로 등록한다. 체크한 것만 처리된다 */
export function ReceiptCard({ d, projects, people, categories, docTypes, expenses, onChange }: Props) {
  const missing = missingFields(d)
  const owners = people.filter((p) => !d.project_id || p.project_id === d.project_id)
  const projectName = (id: string) => projects.find((p) => p.id === id)?.short_name ?? ''

  return (
    <article className={`rounded-2xl border bg-white/80 p-4 ${d.include ? 'border-white' : 'border-dashed border-line opacity-60'}`}>
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="shrink-0 sm:w-36">
          <a href={d.imageUrl} target="_blank" rel="noreferrer" title="원본 크게 보기">
            {d.isPdf ? (
              <span className="flex h-40 w-full flex-col items-center justify-center gap-2 rounded-xl bg-brand-soft p-2 text-center sm:h-48">
                <FileText aria-hidden size={36} className="text-brand" />
                <span className="line-clamp-3 text-[12px] break-all text-body">{d.fileName}</span>
              </span>
            ) : (
              <img src={d.imageUrl} alt={d.fileName} className="h-40 w-full rounded-xl object-cover sm:h-48" />
            )}
          </a>
          <label className="mt-2 flex min-h-11 cursor-pointer items-center gap-2 font-medium">
            <input type="checkbox" checked={d.include} onChange={(e) => onChange({ include: e.target.checked })} className="h-5 w-5 accent-brand" />
            처리하기
          </label>
        </div>

        <div className="min-w-0 flex-1">
          {/* 무슨 서류인지 (AI가 읽은 값, 고칠 수 있음) */}
          <div className="mb-3 flex flex-wrap items-end gap-3">
            <label className="block">
              <span className="mb-1 block text-[13px] font-medium text-body">서류 종류</span>
              <select className={`${input} w-48`} value={d.docType} onChange={(e) => onChange({ docType: e.target.value })}>
                <option value="">모르겠음</option>
                {[...new Set([...docTypes, d.docType].filter(Boolean))].map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </label>
            {d.attendees != null && <span className="pb-3 text-[13px] text-body">참석 {d.attendees}명</span>}
            <div className="ml-auto inline-flex gap-1 rounded-xl bg-white p-1 shadow-sm" role="group" aria-label="처리 방법">
              {MODES.map((m) => (
                <button key={m.key} type="button" onClick={() => onChange({ mode: m.key })} aria-pressed={d.mode === m.key}
                  className={`min-h-10 rounded-lg px-3 text-[14px] ${d.mode === m.key ? 'bg-brand font-semibold text-white' : 'text-body hover:bg-canvas'}`}>
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {d.notes.length > 0 && (
            <ul className="mb-3 flex flex-wrap gap-2">
              {d.notes.map((n) => (
                <li key={n} className="flex items-center gap-1 rounded-full bg-[#fff6db] px-3 py-1 text-[13px]">
                  <TriangleAlert aria-hidden size={14} className="text-warn" /> {n}
                </li>
              ))}
            </ul>
          )}

          {d.mode === 'attach' ? (
            <>
              <p className="mb-3 text-[13px] text-body">
                AI가 읽은 내용: {[d.paid_date, d.amount && `${Number(d.amount).toLocaleString('ko-KR')}원`, d.vendor, d.description].filter(Boolean).join(' · ') || '없음'}
              </p>
              <AttachPicker d={d} expenses={expenses} projectName={projectName} onChange={onChange} />
            </>
          ) : (
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
          )}
          {d.include && missing.length > 0 && <p className="mt-2 text-[13px] text-danger">{missing.join(', ')}을(를) 골라 주세요.</p>}
        </div>
      </div>
    </article>
  )
}
