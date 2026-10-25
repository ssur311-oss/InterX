import type { RiskCode } from '../lib/rules/riskRules'

export const RISK_LABEL: Record<RiskCode, string> = {
  WEEKEND: '주말·공휴일',
  LATE_NIGHT: '심야',
  SPLIT: '분할 결제 의심',
  OUT_OF_PERIOD: '과제 기간 외',
  MEETING_LIMIT: '회의비 1인당 초과',
}

// 위험 표시는 위반 확정이 아니라 "확인 필요"라는 뜻 (RULE.md 2장)
export function RiskTag({ code, detail, resolved = false }: { code: RiskCode; detail?: string | null; resolved?: boolean }) {
  return (
    <span
      title={detail ?? undefined}
      className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs ${
        resolved ? 'bg-gray-100 text-gray-500 line-through' : 'bg-orange-50 text-orange-800'
      }`}
    >
      ⚠️ {RISK_LABEL[code]} · {resolved ? '소명 완료' : '확인 필요'}
    </span>
  )
}

export function NoRuleTag() {
  return (
    <span title="규칙표에 없는 비목·결제 조합이라 결제 증빙만 만들었어요" className="inline-flex rounded bg-purple-50 px-2 py-0.5 text-xs text-purple-800">
      📋 규칙 없음 · 확인 필요
    </span>
  )
}
