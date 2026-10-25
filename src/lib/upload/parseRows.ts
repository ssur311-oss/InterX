import { parseDateTimeCell, seoulParts } from '../date'
import { normalize } from '../rules/docRules'
import type { PayMethod, Person, Project } from '../types'
import type { ColumnMap, Sheet, UploadFieldKey } from './parseSheet'

export type NewExpense = {
  id: string
  project_id: string
  category: string
  sub_category: string | null
  pay_method: PayMethod
  amount: number
  paid_at: string
  vendor: string | null
  description: string | null
  owner_id: string | null
}

export type ExistingExpense = { id: string; project_id: string; paid_at: string; amount: number; vendor: string | null }

export type ParsedRow = {
  rowNumber: number // 엑셀에서 보이는 줄 번호
  expense: NewExpense | null // 오류가 있으면 null
  projectName: string
  ownerName: string
  errors: string[]
  warnings: string[]
  duplicate: boolean
}

type Context = { projects: Project[]; people: Person[]; existing: ExistingExpense[] }

const text = (v: unknown) => (v === null || v === undefined ? '' : String(v).trim())

function parsePayMethod(v: unknown): PayMethod | null {
  const s = normalize(text(v)).toLowerCase()
  if (/카드|card/.test(s)) return 'card'
  if (/이체|계좌|transfer/.test(s)) return 'transfer'
  return null
}

function parseAmount(v: unknown): number | null {
  if (typeof v === 'number') return Number.isInteger(v) && v > 0 ? v : null
  const s = text(v).replace(/[,\s원]/g, '')
  return /^\d+$/.test(s) && Number(s) > 0 ? Number(s) : null
}

// 같은 과제·같은 일시(분 단위)·같은 금액·같은 거래처면 이미 올린 건으로 본다
export function duplicateKey(e: ExistingExpense): string {
  const p = seoulParts(e.paid_at)
  return `${e.project_id}|${p.date} ${p.hour}:${p.minute}|${e.amount}|${normalize(e.vendor)}`
}

export function parseRows(sheet: Sheet, map: ColumnMap, ctx: Context): ParsedRow[] {
  const existingKeys = new Set(ctx.existing.map(duplicateKey))

  return sheet.rows.map((cells, i) => {
    const cell = (key: UploadFieldKey) => (map[key] === null ? null : cells[map[key]] ?? null)
    const errors: string[] = []
    const warnings: string[] = []

    const projectName = text(cell('project'))
    const project = ctx.projects.find(
      (p) => normalize(p.name) === normalize(projectName) || normalize(p.short_name) === normalize(projectName),
    )
    if (!project) errors.push(projectName ? `과제 '${projectName}'를 설정에서 찾을 수 없음` : '과제가 비어 있음')

    const category = text(cell('category'))
    if (!category) errors.push('비목이 비어 있음')

    const payMethod = parsePayMethod(cell('pay_method'))
    if (!payMethod) errors.push(`결제방법 '${text(cell('pay_method'))}'을 알 수 없음 (카드 / 계좌이체)`)

    const paidAt = parseDateTimeCell(cell('paid_at'))
    if (!paidAt) errors.push(`집행일시 '${text(cell('paid_at'))}'을 읽을 수 없음`)

    const amount = parseAmount(cell('amount'))
    if (amount === null) errors.push(`금액 '${text(cell('amount'))}'이 올바르지 않음 (원 단위 정수)`)

    const ownerName = text(cell('owner'))
    const owner = ctx.people.find((p) => p.name === ownerName)
    if (ownerName && !owner) warnings.push(`사용자 '${ownerName}'가 사람 목록에 없음 — 사용자 없이 등록`)

    const vendor = text(cell('vendor')) || null
    if (!vendor) warnings.push('거래처가 비어 있음')

    if (errors.length || !project || !payMethod || !paidAt || amount === null) {
      return { rowNumber: i + 2, expense: null, projectName, ownerName, errors, warnings, duplicate: false }
    }

    const expense: NewExpense = {
      id: crypto.randomUUID(),
      project_id: project.id,
      category,
      sub_category: text(cell('sub_category')) || null,
      pay_method: payMethod,
      amount,
      paid_at: paidAt,
      vendor,
      description: text(cell('description')) || null,
      owner_id: owner?.id ?? null,
    }
    const duplicate = existingKeys.has(duplicateKey(expense))
    return { rowNumber: i + 2, expense, projectName: project.short_name, ownerName, errors, warnings, duplicate }
  })
}
