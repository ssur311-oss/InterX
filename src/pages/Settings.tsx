import { useState } from 'react'
import { Card, PageHeader, Workspace } from '../components/ui'
import { EditableTable, type Field } from '../components/EditableTable'
import { useRows } from '../lib/useRows'
import { PAY_METHOD_LABEL, REPEAT_LABEL, type DocRule, type Person, type Project, type Schedule, type Setting } from '../lib/types'

const TABS = ['과제', '사람', '증빙 규칙표', '반복 일정', '위험 기준값'] as const
type Tab = (typeof TABS)[number]

const PROJECT_FIELDS: Field[] = [
  { key: 'name', label: '과제명', type: 'text', required: true, className: 'min-w-56' },
  { key: 'short_name', label: '약칭(파일명용)', type: 'text', required: true, className: 'min-w-28' },
  { key: 'agency', label: '전문기관', type: 'text', className: 'min-w-40' },
  { key: 'start_date', label: '시작일', type: 'date', required: true },
  { key: 'end_date', label: '종료일', type: 'date', required: true },
  { key: 'settlement_deadline', label: '정산 기한', type: 'date' },
  { key: 'internal_buffer_days', label: '사내 마감 여유일(영업일)', type: 'number', required: true, className: 'w-24' },
]

const PAY_OPTIONS = Object.entries(PAY_METHOD_LABEL).map(([value, label]) => ({ value, label }))

const DOC_RULE_FIELDS: Field[] = [
  { key: 'category', label: '비목', type: 'text', required: true, className: 'min-w-32' },
  { key: 'sub_category', label: '세목', type: 'text', className: 'min-w-24' },
  { key: 'pay_method', label: '결제 방법', type: 'select', options: PAY_OPTIONS, required: true, className: 'min-w-28' },
  { key: 'doc_type', label: '필요 증빙', type: 'text', required: true, className: 'min-w-36' },
  { key: 'required', label: '필수', type: 'checkbox' },
  { key: 'sort_order', label: '순서', type: 'number', className: 'w-20' },
]

const SETTING_FIELDS: Field[] = [
  { key: 'label', label: '항목', type: 'readonly' },
  { key: 'value', label: '값', type: 'text', required: true, className: 'min-w-32' },
]

function ProjectsTab() {
  const { rows, reload } = useRows<Project>('projects', 'start_date')
  return (
    <EditableTable table="projects" idKey="id" fields={PROJECT_FIELDS} rows={rows} onChanged={reload}
      canAdd newRow={{ internal_buffer_days: 5 }} />
  )
}

function PeopleTab() {
  const { rows, reload } = useRows<Person>('people', 'project_id,role,name')
  const { rows: projects } = useRows<Project>('projects', 'start_date')
  const fields: Field[] = [
    { key: 'name', label: '이름', type: 'text', required: true, className: 'min-w-24' },
    { key: 'project_id', label: '과제', type: 'select', className: 'min-w-44',
      options: projects.map((p) => ({ value: p.id, label: p.short_name })) },
    { key: 'role', label: '역할', type: 'select', required: true, className: 'min-w-32',
      options: [{ value: '연구책임자', label: '연구책임자' }, { value: '참여연구원', label: '참여연구원' }] },
    { key: 'department', label: '부서(참고)', type: 'text', className: 'min-w-28' },
    { key: 'slack_user_id', label: '슬랙 ID', type: 'text', className: 'min-w-28' },
  ]
  return <EditableTable table="people" idKey="id" fields={fields} rows={rows} onChanged={reload} canAdd newRow={{ role: '참여연구원' }} />
}

function DocRulesTab() {
  const { rows, reload } = useRows<DocRule>('doc_rules', 'category,sub_category,pay_method,sort_order')
  return (
    <>
      <p className="mb-4 text-body">
        집행 건의 <b>비목·세목 × 결제 방법</b>이 같은 줄을 찾아 필요 증빙을 만들어요. 세목이 없는 비목은 세목 칸을 비워 두세요.
      </p>
      <EditableTable table="doc_rules" idKey="id" fields={DOC_RULE_FIELDS} rows={rows} onChanged={reload}
        canAdd canDelete newRow={{ required: true, sort_order: 1 }} />
    </>
  )
}

const SCHEDULE_FIELDS: Field[] = [
  { key: 'title', label: '일정 이름', type: 'text', required: true, className: 'min-w-44' },
  { key: 'kind', label: '종류', type: 'select', required: true, className: 'min-w-24',
    options: ['마감', '급여', '감사', '보고', '기타'].map((v) => ({ value: v, label: v })) },
  { key: 'repeat', label: '반복', type: 'select', required: true, className: 'min-w-28',
    options: Object.entries(REPEAT_LABEL).map(([value, label]) => ({ value, label })) },
  { key: 'base_date', label: '기준 날짜', type: 'date', required: true },
  { key: 'docs', label: '준비 서류(쉼표로 구분)', type: 'text', className: 'min-w-64' },
  { key: 'remind_days', label: '며칠 전 알림', type: 'number', required: true, className: 'w-20' },
]

function SchedulesTab() {
  const { rows, reload } = useRows<Schedule>('schedules', 'base_date')
  return (
    <>
      <p className="mb-4 text-body">
        매월·분기·매년 돌아오는 기한을 넣으면 캘린더에 표시되고, <b>며칠 전 알림</b>부터 위쪽 종에 알림이 떠요.
        반복이면 기준 날짜의 '일'(매년이면 달과 일)마다 되풀이되고, 주말·공휴일이면 직전 영업일로 당겨져요.
      </p>
      <EditableTable table="schedules" idKey="id" fields={SCHEDULE_FIELDS} rows={rows} onChanged={reload}
        canAdd canDelete newRow={{ kind: '마감', repeat: 'monthly', remind_days: 7 }} />
    </>
  )
}

function ThresholdsTab() {
  const { rows, reload } = useRows<Setting>('settings', 'key')
  return <EditableTable table="settings" idKey="key" fields={SETTING_FIELDS} rows={rows} onChanged={reload} />
}

export default function Settings() {
  const [tab, setTab] = useState<Tab>('과제')
  return (
    <Workspace>
      <PageHeader title="설정" desc="값은 예시 기본값이에요. 과제 협약·전문기관 지침에 맞춰 고쳐 주세요." />
      <div className="glass mb-6 inline-flex flex-wrap gap-1 rounded-2xl p-1">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)} aria-pressed={tab === t}
            className={`min-h-12 rounded-xl px-5 ${tab === t ? 'bg-white font-semibold text-ink shadow-sm' : 'text-body hover:bg-white/50'}`}>
            {t}
          </button>
        ))}
      </div>
      <Card>
        {tab === '과제' && <ProjectsTab />}
        {tab === '사람' && <PeopleTab />}
        {tab === '증빙 규칙표' && <DocRulesTab />}
        {tab === '반복 일정' && <SchedulesTab />}
        {tab === '위험 기준값' && <ThresholdsTab />}
      </Card>
    </Workspace>
  )
}
