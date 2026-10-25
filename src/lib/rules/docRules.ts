import type { DocRule, PayMethod } from '../types'

// 결제 증빙은 결제 방법으로 정해진다 (RULE.md 1장)
export const PAYMENT_DOC: Record<PayMethod, string> = {
  card: '카드전표',
  transfer: '세금계산서',
}

export type DocRuleInput = { category: string; sub_category: string | null; pay_method: PayMethod }

// 엑셀마다 띄어쓰기가 달라서 공백을 무시하고 비교한다
export const normalize = (s: string | null | undefined) => (s ?? '').replace(/\s/g, '')

/**
 * 비목·세목 × 결제 방법으로 필요 증빙 목록을 찾는다.
 * 세목이 정확히 맞는 규칙이 없으면 세목을 비워 둔 규칙(비목 전체용)을 쓴다.
 * 그것도 없으면 결제 증빙만 만들고 noRule = true ("규칙 없음 — 확인 필요").
 */
export function findRequiredDocs(e: DocRuleInput, rules: DocRule[]): { docs: string[]; noRule: boolean } {
  const sameCategory = rules.filter((r) => normalize(r.category) === normalize(e.category) && r.pay_method === e.pay_method)
  const exact = normalize(e.sub_category)
    ? sameCategory.filter((r) => normalize(r.sub_category) === normalize(e.sub_category))
    : []
  const matched = exact.length ? exact : sameCategory.filter((r) => !normalize(r.sub_category))

  if (!matched.length) return { docs: [PAYMENT_DOC[e.pay_method]], noRule: true }

  const docs = [...matched]
    .filter((r) => r.required)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((r) => r.doc_type)
  return { docs: [...new Set(docs)], noRule: false }
}
