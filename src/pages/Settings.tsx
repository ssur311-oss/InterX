import { useState } from 'react'
import { EditableTable, type Field } from '../components/EditableTable'
import { useRows } from '../lib/useRows'
import { PAY_METHOD_LABEL, type DocRule, type Person, type Project, type Setting } from '../lib/types'

const TABS = ['과제', '사람', '증빙 규칙표', '위험 기준값'] as const
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
      <p className="mb-2 text-sm text-gray-600">
        집행 건의 <b>비목·세목 × 결제 방법</b>이 같은 줄을 찾아 필요 증빙을 만들어요. 세목이 없는 비목은 세목 칸을 비워 두세요.
      </p>
      <EditableTable table="doc_rules" idKey="id" fields={DOC_RULE_FIELDS} rows={rows} onChanged={reload}
        canAdd canDelete newRow={{ required: true, sort_order: 1 }} />
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
    <main className="mx-auto max-w-6xl p-6">
      <h1 className="text-2xl font-bold">설정</h1>
      <p className="mt-1 text-sm text-gray-600">값은 예시 기본값이에요. 과제 협약·전문기관 지침에 맞춰 고쳐 주세요.</p>
      <div className="mt-4 flex gap-1 border-b border-gray-200">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm ${tab === t ? 'border-blue-600 font-semibold text-blue-700' : 'border-transparent text-gray-600 hover:text-gray-900'}`}>
            {t}
          </button>
        ))}
      </div>
      <div className="mt-4">
        {tab === '과제' && <ProjectsTab />}
        {tab === '사람' && <PeopleTab />}
        {tab === '증빙 규칙표' && <DocRulesTab />}
        {tab === '위험 기준값' && <ThresholdsTab />}
      </div>
    </main>
  )
}
