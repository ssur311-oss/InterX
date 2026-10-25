import { formatDate, formatWon } from '../lib/format'
import { PAY_METHOD_LABEL } from '../lib/types'
import type { DashExpense, DashRisk } from '../lib/useDashboard'
import { NoRuleTag, RiskTag } from './RiskTag'
import { StatusBadge } from './StatusBadge'

const ROW_TONE: Record<DashExpense['worst'], string> = {
  overdue: 'bg-red-50/60',
  over_deadline: 'bg-amber-50/60',
  missing: '',
  scheduled: '',
  submitted: 'text-gray-500',
}

type Props = { expense: DashExpense; projectName: string; onResolve: (risk: DashRisk) => void }

export function ExpenseRow({ expense: e, projectName, onResolve }: Props) {
  return (
    <tr className={`border-t border-gray-100 align-top ${ROW_TONE[e.worst]}`}>
      <td className="whitespace-nowrap px-3 py-2">{formatDate(e.paid_at)}</td>
      <td className="whitespace-nowrap px-3 py-2">
        {projectName}
        <div className="text-xs text-gray-500">{e.category}{e.sub_category && ` / ${e.sub_category}`}</div>
      </td>
      <td className="px-3 py-2">
        {e.description}
        <div className="text-xs text-gray-500">{e.vendor} · {PAY_METHOD_LABEL[e.pay_method]}</div>
        {(e.risk_flags.length > 0 || e.no_rule) && (
          <div className="mt-1 flex flex-wrap gap-1">
            {e.risk_flags.map((f) => (
              <RiskTag key={f.id} code={f.rule_code} detail={f.detail} resolved={f.resolved} onClick={() => onResolve(f)} />
            ))}
            {e.no_rule && <NoRuleTag />}
          </div>
        )}
      </td>
      <td className="whitespace-nowrap px-3 py-2 text-right">{formatWon(e.amount)}</td>
      <td className="whitespace-nowrap px-3 py-2">{e.people?.name ?? <span className="text-gray-400">—</span>}</td>
      <td className="px-3 py-2">
        <div className="flex flex-wrap gap-1">
          {e.required_docs.map((d) => (
            <StatusBadge key={d.id} docType={d.doc_type} state={d.state} plannedDate={d.planned_date} />
          ))}
        </div>
      </td>
    </tr>
  )
}
