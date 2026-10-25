import * as XLSX from 'xlsx'

// 엑셀 열 → 집행 건 칸 (CLAUDE.md 9장). aliases는 다른 시스템에서 흔히 쓰는 열 이름.
export const UPLOAD_FIELDS = [
  { key: 'project', label: '과제', required: true, aliases: ['과제', '과제명'] },
  { key: 'category', label: '비목', required: true, aliases: ['비목', '비목명'] },
  { key: 'sub_category', label: '세목', required: false, aliases: ['세목', '세목명'] },
  { key: 'pay_method', label: '결제방법', required: true, aliases: ['결제방법', '결제수단', '지급방법'] },
  { key: 'paid_at', label: '집행일시', required: true, aliases: ['집행일시', '집행일', '사용일시', '거래일시', '승인일시'] },
  { key: 'amount', label: '금액', required: true, aliases: ['금액', '집행금액', '사용금액', '승인금액'] },
  { key: 'vendor', label: '거래처', required: false, aliases: ['거래처', '거래처명', '가맹점', '가맹점명'] },
  { key: 'description', label: '적요', required: false, aliases: ['적요', '내용', '사용내역'] },
  { key: 'owner', label: '사용자', required: false, aliases: ['사용자', '사용자명', '집행자'] },
] as const

export type UploadFieldKey = (typeof UPLOAD_FIELDS)[number]['key']

/** 칸마다 엑셀의 몇 번째 열을 쓸지 (null = 안 씀) */
export type ColumnMap = Record<UploadFieldKey, number | null>

export type Sheet = { headers: string[]; rows: unknown[][] }

/** 첫 번째 시트를 읽는다. 첫 줄은 열 이름, 빈 줄은 버린다 */
export async function readSheet(file: File): Promise<Sheet> {
  const workbook = XLSX.read(await file.arrayBuffer())
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const all = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: true, defval: null, blankrows: false })
  const [head = [], ...rows] = all
  return {
    headers: head.map((h) => String(h ?? '').trim()),
    rows: rows.filter((r) => r.some((c) => c !== null && String(c).trim() !== '')),
  }
}

const squash = (s: string) => s.replace(/\s/g, '')

/** 열 이름으로 자동 매칭. 못 찾은 칸은 관리자가 화면에서 고른다 */
export function autoMatch(headers: string[]): ColumnMap {
  const map = {} as ColumnMap
  for (const f of UPLOAD_FIELDS) {
    const index = headers.findIndex((h) => (f.aliases as readonly string[]).includes(squash(h)))
    map[f.key] = index >= 0 ? index : null
  }
  return map
}
