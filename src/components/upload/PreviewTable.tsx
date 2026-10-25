import { formatDate, formatTime, formatWon } from '../../lib/format'
import type { RiskFlag } from '../../lib/rules/riskRules'
import { PAY_METHOD_LABEL } from '../../lib/types'
import type { ParsedRow } from '../../lib/upload/parseRows'
import { AddDocInline } from '../AddDocInline'
import { NoRuleTag, RiskTag } from '../RiskTag'

export type PreviewRow = ParsedRow & { docs: string[]; noRule: boolean; flags: RiskFlag[] }

function RowStatus({ row }: { row: PreviewRow }) {
  if (row.errors.length) return <span className="text-red-700">❌ 오류</span>
  if (row.duplicate) return <span className="text-gray-500">🔁 이미 등록됨</span>
  return <span className="text-ok">✅ 등록</span>
}

type Props = {
  rows: PreviewRow[]
  /** 관리자가 줄마다 직접 추가한 서류 (줄 번호 → 서류 이름들) */
  extras: Record<number, string[]>
  onAddDoc: (rowNumber: number, name: string) => void
  onRemoveDoc: (rowNumber: number, name: string) => void
  docSuggestions: string[]
}

export function PreviewTable({ rows, extras, onAddDoc, onRemoveDoc, docSuggestions }: Props) {
  return (
    <div className="max-h-full overflow-auto rounded-xl border border-white/90 bg-white/60">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-white text-left text-body">
          <tr>
            <th className="px-3 py-2">줄</th>
            <th className="px-3 py-2">상태</th>
            <th className="px-3 py-2">집행일시</th>
            <th className="px-3 py-2">과제 / 비목</th>
            <th className="px-3 py-2">내용</th>
            <th className="px-3 py-2 text-right">금액</th>
            <th className="px-3 py-2">사용자</th>
            <th className="px-3 py-2">만들 증빙 · 위험</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const e = r.expense
            return (
              <tr key={r.rowNumber} className={`border-t border-line align-top ${r.errors.length ? 'bg-red-50/40' : r.duplicate ? 'text-gray-400' : ''}`}>
                <td className="px-3 py-2 text-gray-500">{r.rowNumber}</td>
                <td className="whitespace-nowrap px-3 py-2"><RowStatus row={r} /></td>
                <td className="whitespace-nowrap px-3 py-2">{e && `${formatDate(e.paid_at)} ${formatTime(e.paid_at)}`}</td>
                <td className="whitespace-nowrap px-3 py-2">
                  {r.projectName}
                  {e && <div className="text-xs text-gray-500">{e.category}{e.sub_category && ` / ${e.sub_category}`}</div>}
                </td>
                <td className="px-3 py-2">
                  {e?.description}
                  {e && <div className="text-xs text-gray-500">{e.vendor} · {PAY_METHOD_LABEL[e.pay_method]}</div>}
                  {[...r.errors, ...r.warnings].map((m) => (
                    <div key={m} className={`text-xs ${r.errors.includes(m) ? 'text-red-700' : 'text-amber-700'}`}>• {m}</div>
                  ))}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-right">{e && formatWon(e.amount)}</td>
                <td className="whitespace-nowrap px-3 py-2">{r.ownerName}</td>
                <td className="px-3 py-2">
                  {e && !r.duplicate && (
                    <div className="flex flex-wrap gap-1">
                      {r.docs.map((d) => (
                        <span key={d} className="rounded bg-gray-100 px-2 py-0.5 text-xs">{d}</span>
                      ))}
                      {(extras[r.rowNumber] ?? []).map((d) => (
                        <span key={d} className="inline-flex items-center gap-1 rounded bg-brand-soft px-2 py-0.5 text-xs font-medium text-brand" title="직접 추가한 서류">
                          {d}
                          <button type="button" onClick={() => onRemoveDoc(r.rowNumber, d)} aria-label={`${d} 빼기`} className="rounded px-0.5 hover:bg-white/70">×</button>
                        </span>
                      ))}
                      <AddDocInline existing={[...r.docs, ...(extras[r.rowNumber] ?? [])]} suggestions={docSuggestions}
                        onAdd={(name) => onAddDoc(r.rowNumber, name)} />
                      {r.noRule && <NoRuleTag />}
                      {r.flags.map((f) => <RiskTag key={f.rule_code} code={f.rule_code} detail={f.detail} />)}
                    </div>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
