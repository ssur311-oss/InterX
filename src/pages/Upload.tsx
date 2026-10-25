import { useEffect, useMemo, useState, type ChangeEvent } from 'react'
import { Link } from 'react-router-dom'
import { Check, FileSpreadsheet, Upload as UploadIcon } from 'lucide-react'
import { BTN_GHOST, BTN_PRIMARY, Card, PageHeader, Workspace } from '../components/ui'
import { ColumnMapper, missingRequiredColumns } from '../components/upload/ColumnMapper'
import { PreviewTable, type PreviewRow } from '../components/upload/PreviewTable'
import { findRequiredDocs } from '../lib/rules/docRules'
import { computeRiskFlags, riskConfigFromSettings } from '../lib/rules/riskRules'
import { parseRows } from '../lib/upload/parseRows'
import { autoMatch, readSheet, type ColumnMap, type Sheet } from '../lib/upload/parseSheet'
import { loadUploadContext, registerExpenses, syncRiskFlags, type UploadContext } from '../lib/upload/register'

const STEPS = [
  ['내려받기', '연구비 관리 시스템이나 카드사에서 이번 달 집행 내역을 엑셀로 받아요.'],
  ['올리기', '여기에 올리면 비목·결제 방법에 맞는 필요 서류와 감사 확인 필요 건이 자동으로 정리돼요.'],
  ['체크하기', '등록한 뒤에는 증빙 체크리스트에서 받은 서류를 체크하며 관리해요.'],
] as const

export default function Upload() {
  const [ctx, setCtx] = useState<UploadContext | null>(null)
  const [file, setFile] = useState<{ name: string; sheet: Sheet } | null>(null)
  // 열이 자동으로 다 맞으면 접어 두고 미리보기 표에 자리를 준다
  const [mapOpen, setMapOpen] = useState(false)
  const [map, setMap] = useState<ColumnMap | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  // 규칙표 서류 외에 관리자가 줄마다 직접 추가한 서류 (줄 번호 → 서류 이름들)
  const [extras, setExtras] = useState<Record<number, string[]>>({})

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
  const docsOf = (r: PreviewRow) => [...r.docs, ...(extras[r.rowNumber] ?? [])]
  const docCount = ready.reduce((n, r) => n + docsOf(r).length, 0)
  const docSuggestions = [...new Set(ctx?.rules.map((r) => r.doc_type) ?? [])]
  const riskCount = ready.filter((r) => r.flags.length).length

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    setMessage(null)
    try {
      const sheet = await readSheet(f)
      setFile({ name: f.name, sheet })
      setExtras({})
      setMapOpen(false)
      setMap(autoMatch(sheet.headers))
    } catch {
      setMessage({ ok: false, text: '엑셀 파일을 읽지 못했어요. .xlsx 파일인지 확인해 주세요.' })
    }
  }

  async function register() {
    if (!file) return
    setBusy(true)
    try {
      await registerExpenses(ready.map((r) => ({ expense: r.expense!, docs: docsOf(r), noRule: r.noRule })), file.name)
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

  return (
    <Workspace fit>
      <PageHeader
        title="엑셀 등록"
        desc="집행 내역을 올리면 건마다 필요한 서류 목록이 자동으로 생겨요. [등록]을 누르기 전에는 저장되지 않아요."
        action={
          <div className="flex flex-wrap gap-2">
            <label className={`${BTN_PRIMARY} cursor-pointer ${!ctx ? 'pointer-events-none opacity-50' : ''}`}>
              <UploadIcon aria-hidden size={18} /> 엑셀 파일 고르기
              <input type="file" accept=".xlsx,.xls,.csv" className="sr-only" onChange={onFile} disabled={!ctx} />
            </label>
          </div>
        }
      />

      {!file && (
        <Card className="mb-6">
          <h2 className="text-xl font-semibold">엑셀은 어떤 역할인가요?</h2>
          <p className="mt-2 text-body">
            엑셀은 관리하는 곳이 아니라 <b className="text-ink">처음 한 번 올리는 입구</b>예요. 올린 뒤의 확인·체크·마감 관리는 모두 이 프로그램 안에서 해요.
          </p>
          <ol className="mt-6 grid gap-4 md:grid-cols-3">
            {STEPS.map(([t, d], i) => (
              <li key={t} className="rounded-xl bg-white/60 p-4">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-soft font-bold text-brand">{i + 1}</span>
                <b className="mt-2 block">{t}</b>
                <span className="mt-1 block text-[15px] text-body">{d}</span>
              </li>
            ))}
          </ol>
          <p className="mt-4 text-[13px] text-body">
            필요한 열: 과제 · 비목 · 세목 · 결제방법 · 집행일시 · 금액 · 거래처 · 적요 · 사용자 (이름이 달라도 올린 뒤 직접 맞출 수 있어요)
          </p>
        </Card>
      )}

      {message && (
        <div role="status" className={`glass mb-6 rounded-xl border-l-4 px-4 py-3 ${message.ok ? 'border-l-ok' : 'border-l-danger'}`}>
          {message.text}
          {message.ok && <Link to="/checklist" className="ml-2 font-semibold text-brand underline">체크리스트에서 보기</Link>}
        </div>
      )}

      {file && (
        <p className="mb-4 flex items-center gap-2 text-body">
          <FileSpreadsheet aria-hidden size={18} className="text-ok" /> {file.name} · {file.sheet.rows.length}줄
        </p>
      )}

      {file && map && !mapOpen && missing.length === 0 && (
        <div className="glass mb-4 flex shrink-0 flex-wrap items-center justify-between gap-2 rounded-2xl px-6 py-3">
          <span className="flex items-center gap-2">
            <Check aria-hidden size={18} className="text-ok" />
            <b>1. 열 맞추기</b>
            <span className="text-body">필요한 열을 모두 자동으로 연결했어요.</span>
          </span>
          <button onClick={() => setMapOpen(true)} className={BTN_GHOST}>열 직접 고르기</button>
        </div>
      )}

      {file && map && (mapOpen || missing.length > 0) && (
        <Card className="mb-4 shrink-0">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-xl font-semibold">1. 열 맞추기</h2>
            {missing.length === 0 && <button onClick={() => setMapOpen(false)} className={BTN_GHOST}>접기</button>}
          </div>
          <p className="mt-1 mb-4 text-body">열 이름이 다르면 직접 골라 주세요. <span className="text-danger">*</span>는 꼭 필요한 칸이에요.</p>
          <ColumnMapper headers={file.sheet.headers} map={map} onChange={setMap} />
          {missing.length > 0 && <p className="mt-2 text-danger">{missing.join(', ')} 열을 골라 주세요.</p>}
        </Card>
      )}

      {rows.length > 0 && (
        <Card className="flex flex-col md:min-h-[240px] md:flex-1">
          <h2 className="text-xl font-semibold">2. 미리보기</h2>
          <p className="mt-1 mb-4 text-body">
            전체 {rows.length}줄 — <b className="text-ok">등록 {ready.length}건</b>
            {errorCount > 0 && <> · <b className="text-danger">오류 {errorCount}건</b>(제외)</>}
            {duplicateCount > 0 && <> · 이미 등록됨 {duplicateCount}건(제외)</>}
            {' '}· 만들 서류 {docCount}개 · 위험 확인 필요 {riskCount}건
          </p>
          {/* 줄이 많아도 페이지가 아니라 이 표 안에서만 스크롤한다 */}
          <div className="md:min-h-0 md:flex-1">
            <PreviewTable rows={rows} extras={extras} docSuggestions={docSuggestions}
              onAddDoc={(n, name) => setExtras((cur) => ({ ...cur, [n]: [...(cur[n] ?? []), name] }))}
              onRemoveDoc={(n, name) => setExtras((cur) => ({ ...cur, [n]: (cur[n] ?? []).filter((d) => d !== name) }))} />
          </div>
          <div className="mt-4 flex justify-end">
            <button onClick={register} disabled={busy || ready.length === 0} className={BTN_PRIMARY}>
              {busy ? '등록 중…' : `${ready.length}건 등록하기`}
            </button>
          </div>
        </Card>
      )}

    </Workspace>
  )
}
