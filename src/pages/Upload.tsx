import { useEffect, useMemo, useState, type ChangeEvent } from 'react'
import { Link } from 'react-router-dom'
import { ColumnMapper, missingRequiredColumns } from '../components/upload/ColumnMapper'
import { PreviewTable, type PreviewRow } from '../components/upload/PreviewTable'
import { findRequiredDocs } from '../lib/rules/docRules'
import { computeRiskFlags, riskConfigFromSettings } from '../lib/rules/riskRules'
import { parseRows } from '../lib/upload/parseRows'
import { autoMatch, readSheet, type ColumnMap, type Sheet } from '../lib/upload/parseSheet'
import { loadUploadContext, registerExpenses, syncRiskFlags, type UploadContext } from '../lib/upload/register'

export default function Upload() {
  const [ctx, setCtx] = useState<UploadContext | null>(null)
  const [file, setFile] = useState<{ name: string; sheet: Sheet } | null>(null)
  const [map, setMap] = useState<ColumnMap | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  useEffect(() => {
    loadUploadContext().then(setCtx).catch((e: Error) => setMessage({ ok: false, text: `설정을 읽지 못했어요: ${e.message}` }))
  }, [])

  const missing = map ? missingRequiredColumns(map) : []

  const rows: PreviewRow[] = useMemo(() => {
    if (!ctx || !file || !map || missingRequiredColumns(map).length) return []
    const parsed = parseRows(file.sheet, map, ctx)
    const newOnes = parsed.flatMap((r) => (r.expense && !r.duplicate ? [r.expense] : []))
    // 분할 결제는 기존 건과 묶어서 봐야 하므로 기존 + 새 건 전체로 계산
    const flags = computeRiskFlags([...ctx.existing, ...newOnes], ctx.projects, riskConfigFromSettings(ctx.settings))
    return parsed.map((r) => {
      const doc = r.expense ? findRequiredDocs(r.expense, ctx.rules) : { docs: [], noRule: false }
      return { ...r, ...doc, flags: flags.filter((f) => f.expense_id === r.expense?.id) }
    })
  }, [ctx, file, map])

  const ready = rows.filter((r) => r.expense && !r.duplicate)
  const errorCount = rows.filter((r) => r.errors.length).length
  const duplicateCount = rows.filter((r) => r.duplicate).length
  const docCount = ready.reduce((n, r) => n + r.docs.length, 0)
  const riskCount = ready.filter((r) => r.flags.length).length

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    setMessage(null)
    try {
      const sheet = await readSheet(f)
      setFile({ name: f.name, sheet })
      setMap(autoMatch(sheet.headers))
    } catch {
      setMessage({ ok: false, text: '엑셀 파일을 읽지 못했어요. .xlsx 파일인지 확인해 주세요.' })
    }
  }

  async function register() {
    if (!file) return
    setBusy(true)
    try {
      await registerExpenses(ready.map((r) => ({ expense: r.expense!, docs: r.docs, noRule: r.noRule })), file.name)
      const added = await syncRiskFlags()
      setMessage({ ok: true, text: `집행 ${ready.length}건과 필요 증빙 ${docCount}개를 등록했어요. 위험 표시 ${added}개가 새로 붙었어요.` })
      setFile(null)
      setMap(null)
      setCtx(await loadUploadContext())
    } catch (e) {
      setMessage({ ok: false, text: `등록 중 문제가 생겼어요: ${(e as Error).message}` })
    }
    setBusy(false)
  }

  async function recheck() {
    setBusy(true)
    try {
      const added = await syncRiskFlags()
      setMessage({ ok: true, text: added ? `위험 표시 ${added}개를 새로 붙였어요.` : '새로 찾은 위험 건이 없어요.' })
    } catch (e) {
      setMessage({ ok: false, text: `검사 중 문제가 생겼어요: ${(e as Error).message}` })
    }
    setBusy(false)
  }

  return (
    <main className="mx-auto max-w-6xl p-6">
      <h1 className="text-2xl font-bold">엑셀 업로드</h1>
      <p className="mt-1 text-sm text-gray-600">
        집행 내역 엑셀을 올리면 규칙표대로 필요 증빙을 만들고, 감사 위험 건을 표시해요. [등록]을 누르기 전에는 저장되지 않아요.
      </p>

      {message && (
        <div className={`mt-4 rounded border px-4 py-3 text-sm ${message.ok ? 'border-green-200 bg-green-50 text-green-800' : 'border-red-200 bg-red-50 text-red-800'}`}>
          {message.text}
          {message.ok && <Link to="/" className="ml-2 font-medium underline">현황판에서 보기 →</Link>}
        </div>
      )}

      <section className="mt-6 flex flex-wrap items-center gap-3">
        <label className={`cursor-pointer rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white ${!ctx ? 'pointer-events-none opacity-50' : ''}`}>
          엑셀 파일 고르기
          <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={onFile} disabled={!ctx} />
        </label>
        {file && <span className="text-sm text-gray-700">📄 {file.name} · {file.sheet.rows.length}줄</span>}
        <button onClick={recheck} disabled={busy || !ctx} className="ml-auto rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50">
          기존 집행 건 위험 다시 검사
        </button>
      </section>

      {file && map && (
        <section className="mt-6">
          <h2 className="font-semibold">1. 열 맞추기</h2>
          <p className="mb-3 text-sm text-gray-600">열 이름이 다르면 직접 골라 주세요. <span className="text-red-600">*</span>는 꼭 필요한 칸이에요.</p>
          <ColumnMapper headers={file.sheet.headers} map={map} onChange={setMap} />
          {missing.length > 0 && <p className="mt-2 text-sm text-red-700">{missing.join(', ')} 열을 골라 주세요.</p>}
        </section>
      )}

      {rows.length > 0 && (
        <section className="mt-8">
          <h2 className="font-semibold">2. 미리보기</h2>
          <p className="mb-3 text-sm text-gray-700">
            전체 {rows.length}줄 — <b className="text-green-700">등록 {ready.length}건</b>
            {errorCount > 0 && <> · <b className="text-red-700">오류 {errorCount}건</b>(제외)</>}
            {duplicateCount > 0 && <> · 이미 등록됨 {duplicateCount}건(제외)</>}
            {' '}· 만들 증빙 {docCount}개 · 위험 확인 필요 {riskCount}건
          </p>
          <PreviewTable rows={rows} />
          <div className="mt-4 flex justify-end">
            <button onClick={register} disabled={busy || ready.length === 0}
              className="rounded bg-blue-600 px-5 py-2.5 font-medium text-white disabled:bg-gray-300">
              {busy ? '등록 중…' : `${ready.length}건 등록`}
            </button>
          </div>
        </section>
      )}
    </main>
  )
}
