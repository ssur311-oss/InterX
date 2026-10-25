import { invokeFunction } from './invokeFunction'
import { PAY_METHOD_LABEL } from './types'
import type { UploadContext } from './upload/register'

// 사업비 상담: AI가 근거로 쓸 수 있는 건 이 요약뿐 (규칙표·위험 기준값·과제 정보). 개인정보·금액 내역은 보내지 않는다
export type ChatMsg = { role: 'user' | 'assistant'; text: string }

export function buildConsultContext(ctx: UploadContext): string {
  const rules = new Map<string, string[]>()
  for (const r of [...ctx.rules].sort((a, b) => a.sort_order - b.sort_order)) {
    if (!r.required) continue
    const key = `${r.category}${r.sub_category ? ` / ${r.sub_category}` : ''} · ${PAY_METHOD_LABEL[r.pay_method]}`
    rules.set(key, [...(rules.get(key) ?? []), r.doc_type])
  }
  const settings = ctx.settings.filter((s) => s.key !== 'holidays' && s.label)
  return [
    '[증빙 규칙표] 비목/세목 · 결제 방법 → 필요 서류',
    ...[...rules.entries()].map(([k, docs]) => `- ${k} → ${docs.join(', ')}`),
    '- 규칙표에 없는 조합은 결제 증빙만 만들고 "규칙 없음 — 확인 필요"로 표시. 결제 증빙: 카드 → 카드전표, 계좌이체 → 세금계산서',
    '',
    '[감사 위험 확인 기준] (위반 확정이 아니라 "확인 필요" 표시. 관리자가 소명을 남길 수 있음)',
    '- 주말·공휴일 사용, 과제 기간 밖 사용',
    ...settings.map((s) => `- ${s.label}: ${s.value}`),
    '',
    '[과제]',
    ...ctx.projects.map((p) => `- ${p.name}(${p.short_name}): 기간 ${p.start_date}~${p.end_date}, 정산 기한 ${p.settlement_deadline ?? '미입력'}, 사내 마감 여유 ${p.internal_buffer_days}영업일`),
  ].join('\n')
}

export async function askConsult(history: ChatMsg[], context: string): Promise<string> {
  const res = await invokeFunction<{ text: string }>('ai-assist', { task: 'consult', context, history }, 'AI 상담')
  return res.text
}
