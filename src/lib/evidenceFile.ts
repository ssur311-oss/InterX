import { seoulParts } from './date'
import { supabase } from './supabase'

// 증빙 파일 보관함 (F8, RULE.md 7장)
// 파일은 비공개 저장소 'evidence'의 집행 건 폴더에 저장하고, 표준 파일명은 required_docs.renamed_file_name에 둔다.
// 저장소 경로는 영문·숫자로(한글 경로 문제 방지), 내려받을 때 표준 파일명을 붙인다.
const BUCKET = 'evidence'

export type NamingInfo = {
  expenseId: string
  projectShort: string
  category: string
  paidAt: string // ISO 또는 YYYY-MM-DD
  amount: number
  vendor: string | null
}

/** 파일명에 쓸 수 없는 문자(\ / : * ? " < > |)와 공백을 뺀다 */
const clean = (s: string) => s.replace(/[\\/:*?"<>|\s]/g, '')

/** '연구재료비' → '재료비' (RULE.md 7장 예시처럼 짧게) */
const shortCategory = (c: string) => (c.startsWith('연구') && c.length > 3 ? c.slice(2) : c)

export function extOf(file: File): string {
  const m = file.name.match(/\.([a-zA-Z0-9]{1,5})$/)
  return (m?.[1] ?? (file.type === 'application/pdf' ? 'pdf' : 'jpg')).toLowerCase()
}

/** 과제약칭_비목_YYMMDD_금액_거래처_증빙종류.확장자 (예: 자율제조_재료비_261014_2300000_OO전자_세금계산서.pdf) */
export function standardName(info: NamingInfo, docType: string, ext: string): string {
  const date = (info.paidAt.length === 10 ? info.paidAt : seoulParts(info.paidAt).date).replace(/-/g, '').slice(2)
  const parts = [info.projectShort, shortCategory(info.category), date, String(info.amount), info.vendor ?? '', docType]
  return `${parts.map(clean).filter(Boolean).join('_')}.${ext}`
}

/** 같은 이름이 이미 있으면 _2, _3을 붙인다 */
async function uniqueName(name: string): Promise<string> {
  if (!supabase) return name
  const dot = name.lastIndexOf('.')
  const base = name.slice(0, dot)
  const ext = name.slice(dot)
  const { data } = await supabase.from('required_docs').select('renamed_file_name').like('renamed_file_name', `${base}%`)
  const taken = new Set((data ?? []).map((r: { renamed_file_name: string | null }) => r.renamed_file_name))
  if (!taken.has(name)) return name
  for (let n = 2; ; n++) if (!taken.has(`${base}_${n}${ext}`)) return `${base}_${n}${ext}`
}

/**
 * 파일을 보관함에 올리고 서류 칸에 연결한다. 제출 상태는 바꾸지 않는다
 * (파일을 연결했다고 바로 ✅로 하지 않고 관리자에게 묻는다, RULE.md 7장)
 */
export async function attachFile(file: File, info: NamingInfo, doc: { id: string; doc_type: string }) {
  if (!supabase) throw new Error('Supabase 연결이 없어요')
  const ext = extOf(file)
  const name = await uniqueName(standardName(info, doc.doc_type, ext))
  const path = `${info.expenseId}/${crypto.randomUUID()}.${ext}`
  const up = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type || undefined, upsert: false })
  if (up.error) {
    throw new Error(/bucket/i.test(up.error.message)
      ? '파일 보관함이 아직 없어요. 0008_evidence_storage.sql을 실행해 주세요.'
      : `파일을 올리지 못했어요: ${up.error.message}`)
  }
  const upd = await supabase.from('required_docs').update({ file_path: path, renamed_file_name: name }).eq('id', doc.id)
  if (upd.error) throw upd.error
  const log = await supabase.from('activity_log').insert({
    expense_id: info.expenseId, doc_id: doc.id, kind: 'memo', content: `[파일 보관] ${doc.doc_type} — ${name} (원본: ${file.name})`, source: 'manual',
  })
  if (log.error) throw log.error
  return { path, name }
}

/** 보관한 파일을 새 창으로 연다 (1분짜리 임시 주소라 밖으로 새도 곧 막힌다) */
export async function openFile(path: string) {
  if (!supabase) return
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60)
  if (error || !data) throw new Error(`파일을 열지 못했어요: ${error?.message ?? ''}`)
  window.open(data.signedUrl, '_blank', 'noopener')
}

/** 관리자가 [제출로 체크]를 눌렀을 때 (파일 연결 뒤 묻는 단계) */
export async function markSubmitted(expenseId: string, doc: { id: string; doc_type: string }) {
  if (!supabase) throw new Error('Supabase 연결이 없어요')
  const log = await supabase.from('activity_log').insert({
    expense_id: expenseId, doc_id: doc.id, kind: 'submitted', content: `[제출 확인] ${doc.doc_type} — 보관한 파일로 확인`, source: 'manual',
  })
  if (log.error) throw log.error
  const upd = await supabase.from('required_docs').update({ status: 'submitted' }).eq('id', doc.id)
  if (upd.error) throw upd.error
}

/** 파일 하나를 표준 이름으로 내려받는다 */
export async function downloadFile(path: string, name: string) {
  if (!supabase) return
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60, { download: name })
  if (error || !data) throw new Error(`파일을 받지 못했어요: ${error?.message ?? ''}`)
  const a = document.createElement('a')
  a.href = data.signedUrl
  a.click()
}

export type ZipItem = { path: string; name: string; folder: string }

/** 여러 파일을 과제별 폴더로 묶어 ZIP 하나로 내려받는다 (F8). onProgress(받은 개수, 전체) */
export async function downloadZip(items: ZipItem[], zipName: string, onProgress?: (done: number, total: number) => void) {
  if (!supabase) return
  const { default: JSZip } = await import('jszip') // ZIP 부품은 쓸 때만 불러온다
  const zip = new JSZip()
  let done = 0
  for (const it of items) {
    const { data, error } = await supabase.storage.from(BUCKET).download(it.path)
    if (error || !data) throw new Error(`${it.name}을(를) 받지 못했어요: ${error?.message ?? ''}`)
    zip.file(`${it.folder}/${it.name}`, data)
    onProgress?.(++done, items.length)
  }
  const blob = await zip.generateAsync({ type: 'blob' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = zipName
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}
