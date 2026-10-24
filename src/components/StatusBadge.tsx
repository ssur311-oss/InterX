export type DocStatus = 'submitted' | 'scheduled' | 'missing'

const ICON: Record<DocStatus, string> = {
  submitted: '✅',
  scheduled: '⏳',
  missing: '❌',
}

const STYLE: Record<DocStatus, string> = {
  submitted: 'bg-green-50 text-green-800',
  scheduled: 'bg-amber-50 text-amber-800',
  missing: 'bg-red-50 text-red-800',
}

// 0단계: 저장된 상태만 표시. 약속일 경과(🔴)·마감 넘는 예정(⚠️) 계산은 3단계에서 추가
export function StatusBadge({ docType, status }: { docType: string; status: DocStatus }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs ${STYLE[status]}`}>
      {ICON[status]} {docType}
    </span>
  )
}
