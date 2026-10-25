import { ClipboardList, TriangleAlert } from 'lucide-react'
import type { RiskCode } from '../lib/rules/riskRules'

export const RISK_LABEL: Record<RiskCode, string> = {
  WEEKEND: '주말·공휴일',
  LATE_NIGHT: '심야',
  SPLIT: '분할 결제 의심',
  OUT_OF_PERIOD: '과제 기간 외',
  MEETING_LIMIT: '회의비 1인당 초과',
}

// 위험 표시는 위반 확정이 아니라 "확인 필요"라는 뜻 (RULE.md 2장)
type RiskTagProps = { code: RiskCode; detail?: string | null; resolved?: boolean; onClick?: () => void }

export function RiskTag({ code, detail, resolved = false, onClick }: RiskTagProps) {
  const className = `inline-flex min-h-8 items-center gap-1 rounded-full px-3 text-[13px] font-medium ${
    resolved ? 'bg-white/60 text-body' : 'bg-[#fff6db] text-ink'
  }`
  const label = (
    <>
      <TriangleAlert aria-hidden size={14} className={resolved ? '' : 'text-warn'} />
      {RISK_LABEL[code]} · {resolved ? '소명 완료' : '확인 필요'}
    </>
  )
  if (onClick && !resolved) {
    return (
      <button type="button" title={`${detail ?? ''}\n눌러서 소명 처리`} onClick={onClick}
        className={`${className} ring-warn hover:ring-1`}>
        {label}
      </button>
    )
  }
  return <span title={detail ?? undefined} className={className}>{label}</span>
}

export function NoRuleTag() {
  return (
    <span title="규칙표에 없는 비목·결제 조합이라 결제 증빙만 만들었어요" className="inline-flex min-h-8 items-center gap-1 rounded-full bg-white/70 px-3 text-[13px] font-medium text-body">
      <ClipboardList aria-hidden size={14} />
      규칙 없음 · 확인 필요
    </span>
  )
}
