import { invokeFunction } from './invokeFunction'
import { findRequiredDocs, PAYMENT_DOC } from './rules/docRules'
import { supabase } from './supabase'
import type { PayMethod } from './types'
import { registerExpenses, syncRiskFlags, type UploadContext } from './upload/register'
import type { NewExpense } from './upload/parseRows'

// AI가 읽은 값은 '초안'이다. 관리자가 표에서 고치고 [등록]을 눌러야 저장된다 (RULE.md 0장)
export type AiReceipt = {
  image_index: number
  readable: boolean
  paid_date: string | null
  paid_time: string | null
  amount: number | null
  vendor: string | null
  description: string
  pay_method: PayMethod | 'unknown'
  doc_kind: string
  category: string | null
  sub_category: string | null
  project_id: string | null
  notes: string[]
}

export type ReceiptDraft = {
  key: string
  include: boolean
  imageUrl: string
  fileName: string
  paid_date: string
  paid_time: string
  amount: string
  vendor: string
  description: string
  pay_method: PayMethod | ''
  category: string
  sub_category: string
  project_id: string
  owner_id: string
  notes: string[]
}

const MAX_SIDE = 1600

/** 사진을 긴 변 1600px JPEG로 줄여 보낸다 (전송량·비용 절약, 글자는 충분히 읽힘) */
async function shrink(file: File): Promise<{ media_type: 'image/jpeg'; data: string }> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  return { media_type: 'image/jpeg', data: canvas.toDataURL('image/jpeg', 0.85).split(',')[1] }
}

/** AI에는 사진과 과제 이름·비목 목록만 보낸다 (금액·사람 정보는 보내지 않음, RULE.md 9장) */
export async function readReceipts(files: File[], ctx: UploadContext): Promise<AiReceipt[]> {
  const images = await Promise.all(files.map(shrink))
  const res = await invokeFunction<{ receipts: AiReceipt[] }>('ai-assist', {
    task: 'receipt',
    images,
    projects: ctx.projects.map((p) => ({ id: p.id, name: `${p.short_name} (${p.name})` })),
    categories: [...new Set(ctx.rules.map((r) => r.category))],
  }, 'AI 읽기')
  return res.receipts
}

export function toDraft(r: AiReceipt | undefined, file: { name: string; url: string }, key: string, ctx: UploadContext): ReceiptDraft {
  const known = (id: string | null) => (id && ctx.projects.some((p) => p.id === id) ? id : '')
  return {
    key, include: Boolean(r?.readable), imageUrl: file.url, fileName: file.name,
    paid_date: r?.paid_date ?? '', paid_time: r?.paid_time ?? '',
    amount: r?.amount != null ? String(r.amount) : '',
    vendor: r?.vendor ?? '', description: r?.description ?? '',
    pay_method: r && r.pay_method !== 'unknown' ? r.pay_method : '',
    category: r?.category ?? '', sub_category: r?.sub_category ?? '',
    project_id: known(r?.project_id ?? null), owner_id: '',
    notes: r ? (r.readable ? r.notes : ['사진을 읽지 못했어요. 직접 입력하거나 빼 주세요.', ...r.notes]) : ['AI 결과가 없어요'],
  }
}

/** 등록 전에 꼭 있어야 하는 칸 (비어 있으면 [등록]을 막는다) */
export function missingFields(d: ReceiptDraft): string[] {
  const out: string[] = []
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.paid_date)) out.push('날짜')
  if (!/^\d+$/.test(d.amount.replace(/,/g, ''))) out.push('금액')
  if (!d.pay_method) out.push('결제방법')
  if (!d.project_id) out.push('과제')
  if (!d.category.trim()) out.push('비목')
  return out
}

/**
 * 관리자가 [등록]을 눌렀을 때만 실행. 엑셀 등록과 같은 길(규칙표로 필요 증빙 생성 → 위험 검사)을 탄다.
 * markPaid면 사진 자체를 결제 증빙(카드전표·세금계산서)으로 보고 제출 처리한다 (RULE.md 7장: 관리자가 고른 경우만)
 */
export async function registerReceipts(drafts: ReceiptDraft[], ctx: UploadContext, markPaid: boolean) {
  const items = drafts.map((d) => {
    const time = /^\d{1,2}:\d{2}$/.test(d.paid_time) ? d.paid_time.padStart(5, '0') : '12:00'
    const expense: NewExpense = {
      id: crypto.randomUUID(),
      project_id: d.project_id,
      category: d.category.trim(),
      sub_category: d.sub_category.trim() || null,
      pay_method: d.pay_method as PayMethod,
      amount: Number(d.amount.replace(/,/g, '')),
      paid_at: `${d.paid_date}T${time}:00+09:00`,
      vendor: d.vendor.trim() || null,
      description: d.description.trim() || null,
      owner_id: d.owner_id || null,
    }
    return { expense, ...findRequiredDocs(expense, ctx.rules) }
  })
  await registerExpenses(items, `영수증 사진 ${items.length}장`, 'AI 영수증 읽기')
  const risks = await syncRiskFlags()

  if (markPaid && supabase) {
    for (const { expense } of items) {
      const docType = PAYMENT_DOC[expense.pay_method]
      const log = await supabase.from('activity_log').insert({
        expense_id: expense.id, kind: 'submitted', content: `[제출 확인] ${docType} — 영수증 사진으로 등록`, source: 'manual',
      })
      if (log.error) throw log.error
      const upd = await supabase.from('required_docs').update({ status: 'submitted' }).eq('expense_id', expense.id).eq('doc_type', docType)
      if (upd.error) throw upd.error
    }
  }
  return { count: items.length, risks }
}
