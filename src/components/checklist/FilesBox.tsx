import { useMemo, useState } from 'react'
import { Download, ExternalLink, FolderArchive, Loader2 } from 'lucide-react'
import { StatusText } from '../StatusBadge'
import { BTN, BTN_PRIMARY, Empty, SELECT } from '../ui'
import { seoulParts } from '../../lib/date'
import { downloadFile, downloadZip, openFile } from '../../lib/evidenceFile'
import { formatDate, formatWon } from '../../lib/format'
import type { DashDoc, DashExpense, ProjectWithDeadline } from '../../lib/useDashboard'

type Row = { e: DashExpense; d: DashDoc & { file_path: string; renamed_file_name: string } }

type Props = { expenses: DashExpense[]; projects: ProjectWithDeadline[]; today: string; projectLabel: string }

/**
 * 증빙 체크리스트의 '파일 보관함' 탭 (F8): 보관한 증빙 파일을 과제별로 모아 보고, 열고, 표준 이름으로 내려받는다.
 * 검색·과제·사람 필터는 체크리스트 위쪽 것을 같이 쓴다 (expenses는 이미 걸러진 목록)
 */
export function FilesBox({ expenses, projects, today, projectLabel }: Props) {
  const [month, setMonth] = useState('')
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const all: Row[] = useMemo(
    () => expenses.flatMap((e) => e.required_docs.filter((d): d is Row['d'] => Boolean(d.file_path && d.renamed_file_name)).map((d) => ({ e, d }))),
    [expenses],
  )
  const months = [...new Set(all.map((r) => seoulParts(r.e.paid_at).date.slice(0, 7)))].sort().reverse()
  const rows = all.filter((r) => !month || seoulParts(r.e.paid_at).date.startsWith(month))
  const short = (id: string) => projects.find((p) => p.id === id)?.short_name ?? '과제 없음'
  const groups = projects.map((p) => ({ p, rows: rows.filter((r) => r.e.project_id === p.id) })).filter((g) => g.rows.length)

  const allPicked = rows.length > 0 && rows.every((r) => picked.has(r.d.id))
  const toggle = (id: string) => setPicked((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n })

  async function run(label: string, job: () => Promise<void>) {
    setBusy(label)
    setMsg(null)
    try {
      await job()
    } catch (err) {
      setMsg({ ok: false, text: (err as Error).message })
    }
    setBusy(null)
  }

  // 받을 범위: 고른 파일이 있으면 그것만, 없으면 지금 보이는 전체
  async function zip() {
    const target = rows.filter((r) => !picked.size || picked.has(r.d.id))
    const label = [projectLabel, month ? month.replace('-', '년') + '월' : ''].filter(Boolean).join('_')
    await run('zip', async () => {
      await downloadZip(
        target.map((r) => ({ path: r.d.file_path, name: r.d.renamed_file_name, folder: short(r.e.project_id) })),
        `증빙_${label}_${today.replace(/-/g, '').slice(2)}.zip`,
        (done, total) => setBusy(`zip ${done}/${total}`),
      )
      setMsg({ ok: true, text: `파일 ${target.length}개를 ZIP으로 받았어요.` })
    })
  }

  const zipCount = picked.size || rows.length
  return (
    <>
      {msg && (
        <div role="status" className={`mb-4 rounded-xl border-l-4 bg-white/80 px-4 py-3 ${msg.ok ? 'border-l-ok' : 'border-l-danger'}`}>{msg.text}</div>
      )}

      {all.length === 0 ? (
        <Empty icon={<FolderArchive size={40} />} title="아직 보관한 파일이 없어요"
          desc="'처리 중'이나 '완료함'의 서류 칸에서 📎를 누르거나 파일을 끌어다 놓으면, 표준 이름으로 바꿔서 여기에 모여요." />
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <select aria-label="집행 월" className={SELECT} value={month} onChange={(ev) => { setMonth(ev.target.value); setPicked(new Set()) }}>
              <option value="">전체 기간</option>
              {months.map((m) => <option key={m} value={m}>{m.replace('-', '년 ')}월</option>)}
            </select>
            <label className="flex min-h-11 cursor-pointer items-center gap-2 px-2 text-body">
              <input type="checkbox" checked={allPicked} onChange={() => setPicked(allPicked ? new Set() : new Set(rows.map((r) => r.d.id)))} className="h-5 w-5 accent-brand" />
              보이는 파일 모두 고르기
            </label>
            <button onClick={zip} disabled={!rows.length || busy !== null} className={`${BTN_PRIMARY} ml-auto`}>
              {busy?.startsWith('zip') ? <Loader2 aria-hidden size={18} className="animate-spin" /> : <Download aria-hidden size={18} />}
              {busy?.startsWith('zip') ? `ZIP 만드는 중 ${busy.slice(4)}` : `${picked.size ? '고른' : '보이는'} ${zipCount}개 ZIP으로 받기`}
            </button>
          </div>

          {rows.length === 0 ? (
            <Empty icon={<FolderArchive size={40} />} title="이 기간에는 보관한 파일이 없어요" desc="기간을 '전체 기간'으로 바꾸거나 위쪽 검색·과제·사람 조건을 넓혀 보세요."
              action={<button className={BTN} onClick={() => setMonth('')}>전체 기간 보기</button>} />
          ) : (
            <div className="space-y-6">
              {groups.map(({ p, rows: list }) => (
                <section key={p.id} className="glass overflow-hidden rounded-2xl">
                  <div className="flex items-center justify-between border-b border-line px-6 py-4">
                    <h2 className="flex items-center gap-2 text-xl font-semibold"><FolderArchive aria-hidden size={20} className="text-brand" /> {p.short_name}</h2>
                    <span className="text-[15px] text-body">파일 {list.length}개</span>
                  </div>
                  <ul className="divide-y divide-line">
                    {list.map(({ e, d }) => (
                      <li key={d.id} className="flex flex-wrap items-center gap-3 px-6 py-3">
                        <input type="checkbox" checked={picked.has(d.id)} onChange={() => toggle(d.id)} aria-label={`${d.renamed_file_name} 고르기`} className="h-5 w-5 accent-brand" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium" title={d.renamed_file_name}>{d.renamed_file_name}</p>
                          <p className="flex flex-wrap items-center gap-x-2 text-[13px] text-body">
                            <span>{formatDate(e.paid_at)} {e.description} · {formatWon(e.amount)} · {e.people?.name ?? '담당자 없음'}</span>
                            <StatusText state={d.state} plannedDate={d.planned_date} />
                          </p>
                        </div>
                        <button onClick={() => run('open', () => openFile(d.file_path))} disabled={busy !== null} className={BTN}>
                          <ExternalLink aria-hidden size={16} /> 열기
                        </button>
                        <button onClick={() => run('one', () => downloadFile(d.file_path, d.renamed_file_name))} disabled={busy !== null} className={BTN}>
                          <Download aria-hidden size={16} /> 받기
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </>
      )}
    </>
  )
}
