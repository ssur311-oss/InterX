import * as XLSX from 'xlsx'
import { seoulParts } from './date'
import { formatDate, formatTime } from './format'
import { PAY_METHOD_LABEL } from './types'
import type { DashExpense, ProjectWithDeadline } from './useDashboard'

/** 완료함의 집행 건을 엑셀 파일로 내려받는다 (과제 → 집행일 순). 금액은 숫자 칸으로 둔다 */
export function exportCompleted(expenses: DashExpense[], projects: ProjectWithDeadline[], today: string) {
  const projectName = (id: string) => projects.find((p) => p.id === id)?.short_name ?? ''
  const rows = [...expenses]
    .sort((a, b) => projectName(a.project_id).localeCompare(projectName(b.project_id)) || a.paid_at.localeCompare(b.paid_at))
    .map((e) => ({
      과제: projectName(e.project_id),
      집행일: seoulParts(e.paid_at).date,
      시간: formatTime(e.paid_at),
      비목: e.category,
      세목: e.sub_category ?? '',
      결제방법: PAY_METHOD_LABEL[e.pay_method],
      금액: e.amount,
      거래처: e.vendor ?? '',
      적요: e.description ?? '',
      사용자: e.people?.name ?? '',
      '제출 증빙': e.required_docs.map((d) => d.doc_type).join(', '),
      '증빙 수': e.required_docs.length,
      등록일: formatDate(e.created_at),
    }))
  const sheet = XLSX.utils.json_to_sheet(rows)
  sheet['!cols'] = [10, 12, 8, 14, 10, 10, 14, 16, 24, 10, 40, 8, 10].map((wch) => ({ wch }))
  const book = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(book, sheet, '완료 증빙')
  XLSX.writeFile(book, `완료_증빙_${today.replaceAll('-', '').slice(2)}.xlsx`)
}
