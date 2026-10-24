// DB 테이블 모양 (CLAUDE.md 8장)
export type PayMethod = 'card' | 'transfer'

export const PAY_METHOD_LABEL: Record<PayMethod, string> = {
  card: '카드',
  transfer: '계좌이체',
}

export type Project = {
  id: string
  name: string
  short_name: string
  agency: string | null
  start_date: string
  end_date: string
  settlement_deadline: string | null
  internal_buffer_days: number
}

export type Person = {
  id: string
  name: string
  department: string | null
  project_id: string | null
  role: '연구책임자' | '참여연구원'
  slack_user_id: string | null
}

export type DocRule = {
  id: string
  category: string
  sub_category: string | null
  pay_method: PayMethod
  doc_type: string
  required: boolean
  sort_order: number
}

export type Setting = {
  key: string
  value: string
  label: string | null
}
