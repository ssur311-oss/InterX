import { useState } from 'react'
import { STATE_LABEL, STATE_ORDER, type DocState } from '../../lib/rules/docStatus'
import { StateIcon } from '../StatusBadge'

// 상태 색은 상태에만 쓴다 (다른 데이터 계열에 재사용하지 않음)
export const STATE_FILL: Record<DocState, string> = {
  overdue: 'var(--color-danger)',
  over_deadline: 'var(--color-warn)',
  missing: 'var(--color-muted)',
  scheduled: 'var(--color-brand)',
  submitted: 'var(--color-ok)',
}

const R = 70
const STROKE = 18
const C = 2 * Math.PI * R
const GAP = 3 // 조각 사이 틈(px)

/** 전체 증빙의 상태 비율. 가운데에 제출률, 조각에 마우스를 올리면 그 상태의 개수 */
export function EvidenceDonut({ counts }: { counts: Record<DocState, number> }) {
  const [hover, setHover] = useState<DocState | null>(null)
  const total = STATE_ORDER.reduce((n, s) => n + counts[s], 0)
  // 제출 → 예정 → 미제출 → 경고 순으로 시계 방향
  const order: DocState[] = ['submitted', 'scheduled', 'missing', 'over_deadline', 'overdue']
  let offset = 0
  const segments = order
    .filter((s) => counts[s] > 0)
    .map((s) => {
      const len = (counts[s] / total) * C
      const seg = { s, len, offset }
      offset += len
      return seg
    })
  const pct = total ? Math.round((counts.submitted / total) * 100) : 0
  const focus = hover ?? 'submitted'

  return (
    <div className="flex flex-wrap items-center gap-4">
      <div className="relative mx-auto h-[152px] w-[152px] shrink-0">
        <svg viewBox="0 0 180 180" className="h-full w-full -rotate-90" role="img" aria-label={`증빙 ${total}개 중 ${counts.submitted}개 제출, 제출률 ${pct}%`}>
          <circle cx="90" cy="90" r={R} fill="none" stroke="rgb(17 24 39 / 0.06)" strokeWidth={STROKE} />
          {segments.map(({ s, len, offset: o }) => (
            <circle
              key={s}
              cx="90"
              cy="90"
              r={R}
              fill="none"
              stroke={STATE_FILL[s]}
              strokeWidth={hover === s ? STROKE + 4 : STROKE}
              strokeDasharray={`${Math.max(len - (segments.length > 1 ? GAP : 0), 1)} ${C}`}
              strokeDashoffset={-o}
              onMouseEnter={() => setHover(s)}
              onMouseLeave={() => setHover(null)}
              className="cursor-default transition-[stroke-width]"
            />
          ))}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          {hover ? (
            <>
              <span className="text-[32px] leading-none font-bold">{counts[focus]}</span>
              <span className="mt-1 text-[13px] text-body">{STATE_LABEL[focus]}</span>
            </>
          ) : (
            <>
              <span className="text-[32px] leading-none font-bold">{pct}%</span>
              <span className="mt-1 text-[13px] text-body">제출률</span>
            </>
          )}
        </div>
      </div>

      <ul className="min-w-40 flex-1 space-y-0.5">
        {order.map((s) => (
          <li
            key={s}
            onMouseEnter={() => setHover(s)}
            onMouseLeave={() => setHover(null)}
            className={`flex items-center justify-between gap-4 rounded-lg px-2 py-1 ${hover === s ? 'bg-white/70' : ''}`}
          >
            <span className="flex items-center gap-2 text-[15px]">
              <StateIcon state={s} />
              {STATE_LABEL[s]}
            </span>
            <b className="tabular-nums">{counts[s]}개</b>
          </li>
        ))}
        <li className="flex justify-between border-t border-line px-2 pt-2 text-[15px] text-body">
          <span>전체 서류</span>
          <b className="text-ink tabular-nums">{total}개</b>
        </li>
      </ul>
    </div>
  )
}
