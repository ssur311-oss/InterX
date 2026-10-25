import { daysBetween, seoulParts } from './date'
import { attachFile } from './evidenceFile'
import { invokeFunction } from './invokeFunction'
import { findRequiredDocs, normalize, PAYMENT_DOC } from './rules/docRules'
import { supabase } from './supabase'
import type { PayMethod } from './types'
import { registerExpenses, syncRiskFlags, type UploadContext } from './upload/register'
import type { NewExpense } from './upload/parseRows'
import type { DashExpense } from './useDashboard'

// 증빙 서류 올리기 (사진·PDF). AI가 읽은 값은 '초안'이다.
// 관리자가 고치고, 새 집행 건이면 [등록] / 기존 건의 서류면 건·서류 칸을 직접 골라야 저장된다 (RULE.md 0장)
export type AiReceipt = {
  image_index: number
  readable: boolean
  doc_type: string
  is_payment_proof: boolean
  paid_date: string | null
  paid_time: string | null
  amount: number | null
  vendor: string | null
  description: string
  attendees_count: number | null
  pay_method: PayMethod | 'unknown'
  category: string | null
  sub_category: string | null
  project_id: string | null
  notes: string[]
}

export type DraftMode = 'new' | 'attach'

const projectShort = (ctx: UploadContext, id: string) => ctx.projects.find((p) => p.id === id)?.short_name ?? ''

export type ReceiptDraft = {
  key: string
  include: boolean
  imageUrl: string
  fileName: string
  file: File | null // 처리할 때 보관함에 같이 저장한다
  isPdf: boolean
  docType: string
  attendees: number | null
  mode: DraftMode // new = 새 집행 건 등록, attach = 기존 집행 건의 서류로 체크
  attachExpenseId: string
  attachDocId: string
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
export const MAX_PDF_MB = 5

/** 사진은 긴 변 1600px JPEG로 줄여 보낸다 (전송량·비용 절약, 글자는 충분히 읽힘) */
async function shrink(file: File): Promise<{ media_type: 'image/jpeg'; data: string }> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  return { media_type: 'image/jpeg', data: canvas.toDataURL('image/jpeg', 0.85).split(',')[1] }
}

/** PDF(전자 증빙)는 그대로 보낸다 */
function pdfBase64(file: File): Promise<{ media_type: 'application/pdf'; data: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve({ media_type: 'application/pdf', data: String(reader.result).split(',')[1] })
    reader.onerror = () => reject(new Error(`${file.name}을(를) 읽지 못했어요`))
    reader.readAsDataURL(file)
  })
}

export const isPdf = (f: File) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')

/** 규칙표에 있는 서류 이름들 (AI가 이 중에서 고르게 한다) */
export const docTypesOf = (ctx: UploadContext) => [...new Set(ctx.rules.map((r) => r.doc_type))]

/** AI에는 파일과 과제 이름·비목·서류 이름 목록만 보낸다 (사람 정보는 보내지 않음, RULE.md 9장) */
export async function readReceipts(files: File[], ctx: UploadContext): Promise<AiReceipt[]> {
  const images = await Promise.all(files.map((f) => (isPdf(f) ? pdfBase64(f) : shrink(f))))
  const res = await invokeFunction<{ receipts: AiReceipt[] }>('ai-assist', {
    task: 'receipt',
    images,
    projects: ctx.projects.map((p) => ({ id: p.id, name: `${p.short_name} (${p.name})` })),
    categories: [...new Set(ctx.rules.map((r) => r.category))],
    docTypes: docTypesOf(ctx),
  }, 'AI 읽기')
  return res.receipts
}

export function toDraft(r: AiReceipt | undefined, file: { name: string; url: string; pdf: boolean; file: File }, key: string, ctx: UploadContext): ReceiptDraft {
  const known = (id: string | null) => (id && ctx.projects.some((p) => p.id === id) ? id : '')
  return {
    key, include: Boolean(r?.readable), imageUrl: file.url, fileName: file.name, file: file.file, isPdf: file.pdf,
    docType: r?.doc_type ?? '', attendees: r?.attendees_count ?? null,
    // 결제 증빙이면 새 집행 건, 회의록·검수조서 같은 내부 증빙이면 기존 건에 체크하는 걸 먼저 보여준다
    mode: r && !r.is_payment_proof ? 'attach' : 'new',
    attachExpenseId: '', attachDocId: '',
    paid_date: r?.paid_date ?? '', paid_time: r?.paid_time ?? '',
    amount: r?.amount != null ? String(r.amount) : '',
    vendor: r?.vendor ?? '', description: r?.description ?? '',
    pay_method: r && r.pay_method !== 'unknown' ? r.pay_method : '',
    category: r?.category ?? '', sub_category: r?.sub_category ?? '',
    project_id: known(r?.project_id ?? null), owner_id: '',
    notes: r ? (r.readable ? r.notes : ['파일을 읽지 못했어요. 직접 입력하거나 빼 주세요.', ...r.notes]) : ['AI 결과가 없어요'],
  }
}

/**
 * 기존 건에 붙일 후보: 아직 안 낸 서류가 있는 집행 건을 금액·날짜·거래처·서류 종류가 비슷한 순으로.
 * 코드가 점수로 줄 세울 뿐이고, 어느 건인지는 관리자가 고른다 (RULE.md 5장 원칙과 같음)
 */
export function attachCandidates(d: ReceiptDraft, expenses: DashExpense[], limit = 6) {
  const amount = Number(d.amount.replace(/,/g, ''))
  const words = [d.vendor, d.description].map(normalize).filter((w) => w.length >= 2)
  return expenses
    .filter((e) => e.required_docs.some((x) => x.status !== 'submitted'))
    .map((e) => {
      let score = 0
      if (amount && e.amount === amount) score += 3
      if (/^\d{4}-\d{2}-\d{2}$/.test(d.paid_date)) {
        const gap = Math.abs(daysBetween(seoulParts(e.paid_at).date, d.paid_date))
        if (gap <= 3) score += 2
        else if (gap <= 14) score += 1
      }
      const hay = normalize(`${e.vendor ?? ''}${e.description ?? ''}`)
      if (words.some((w) => hay.includes(w) || w.includes(normalize(e.description)))) score += 2
      if (e.required_docs.some((x) => x.status !== 'submitted' && normalize(x.doc_type) === normalize(d.docType))) score += 2
      return { e, score }
    })
    .sort((a, b) => b.score - a.score || b.e.paid_at.localeCompare(a.e.paid_at))
    .slice(0, limit)
}

/** 처리 전에 꼭 있어야 하는 칸 (비어 있으면 [처리]를 막는다) */
export function missingFields(d: ReceiptDraft): string[] {
  if (d.mode === 'attach') {
    const out: string[] = []
    if (!d.attachExpenseId) out.push('집행 건')
    if (!d.attachDocId) out.push('서류 칸')
    return out
  }
  const out: string[] = []
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.paid_date)) out.push('날짜')
  if (!/^\d+$/.test(d.amount.replace(/,/g, ''))) out.push('금액')
  if (!d.pay_method) out.push('결제방법')
  if (!d.project_id) out.push('과제')
  if (!d.category.trim()) out.push('비목')
  return out
}

/**
 * 관리자가 [처리]를 눌렀을 때만 실행.
 * - 새 집행 건: 엑셀 등록과 같은 길(규칙표로 필요 증빙 생성 → 위험 검사). markPaid면 결제 증빙을 제출 처리
 * - 기존 건 서류: 고른 서류 칸을 제출로 바꾸고 이력을 남긴다 (이력 먼저, RULE.md 0-4)
 */
export async function registerReceipts(drafts: ReceiptDraft[], ctx: UploadContext, markPaid: boolean, expenses: DashExpense[]) {
  if (!supabase) throw new Error('Supabase 연결이 없어요')
  const news = drafts.filter((d) => d.mode === 'new')
  const attaches = drafts.filter((d) => d.mode === 'attach')
  let risks = 0

  if (news.length) {
    const items = news.map((d) => {
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
    await registerExpenses(items, `증빙 파일 ${items.length}개`, 'AI 증빙 읽기')
    risks = await syncRiskFlags()

    // 파일을 보관함에 저장: 같은 종류의 서류 칸 → 없으면 결제 증빙 칸에 연결
    for (const [i, { expense }] of items.entries()) {
      const d = news[i]
      if (!d.file) continue
      const { data } = await supabase.from('required_docs').select('id, doc_type').eq('expense_id', expense.id)
      const slots = (data ?? []) as { id: string; doc_type: string }[]
      const slot = slots.find((x) => normalize(x.doc_type) === normalize(d.docType)) ?? slots.find((x) => x.doc_type === PAYMENT_DOC[expense.pay_method])
      if (slot) await attachFile(d.file, { expenseId: expense.id, projectShort: projectShort(ctx, expense.project_id), category: expense.category, paidAt: expense.paid_at, amount: expense.amount, vendor: expense.vendor }, slot)
    }

    if (markPaid) {
      for (const { expense } of items) {
        const docType = PAYMENT_DOC[expense.pay_method]
        const log = await supabase.from('activity_log').insert({
          expense_id: expense.id, kind: 'submitted', content: `[제출 확인] ${docType} — 증빙 파일로 등록`, source: 'manual',
        })
        if (log.error) throw log.error
        const upd = await supabase.from('required_docs').update({ status: 'submitted' }).eq('expense_id', expense.id).eq('doc_type', docType)
        if (upd.error) throw upd.error
      }
    }
  }

  for (const d of attaches) {
    const e = expenses.find((x) => x.id === d.attachExpenseId)
    const slot = e?.required_docs.find((x) => x.id === d.attachDocId)
    if (d.file && e && slot) {
      await attachFile(d.file, { expenseId: e.id, projectShort: projectShort(ctx, e.project_id), category: e.category, paidAt: e.paid_at, amount: e.amount, vendor: e.vendor }, slot)
    }
    const log = await supabase.from('activity_log').insert({
      expense_id: d.attachExpenseId, doc_id: d.attachDocId, kind: 'submitted',
      content: `[제출 확인] ${d.docType || '서류'} — 파일(${d.fileName})로 확인`, source: 'manual',
    })
    if (log.error) throw log.error
    const upd = await supabase.from('required_docs').update({ status: 'submitted' }).eq('id', d.attachDocId)
    if (upd.error) throw upd.error
  }

  return { added: news.length, attached: attaches.length, risks }
}
