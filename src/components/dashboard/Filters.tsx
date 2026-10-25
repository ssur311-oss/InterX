import type { Filter } from '../../lib/dashboardFilter'
import type { ProjectWithDeadline } from '../../lib/useDashboard'
import type { Person } from '../../lib/types'

type Props = { filter: Filter; projects: ProjectWithDeadline[]; people: Person[]; onChange: (f: Filter) => void }

const select = 'min-h-11 rounded-lg border border-white/90 bg-white/70 px-3 text-[15px] shadow-sm'

// 사람은 과제 → 연구책임자 → 참여연구원 순으로 묶어서 보여준다
export function Filters({ filter, projects, people, onChange }: Props) {
  const visibleProjects = filter.projectId ? projects.filter((p) => p.id === filter.projectId) : projects
  return (
    <div className="flex flex-wrap items-center gap-2">
      <select aria-label="과제 필터" className={select} value={filter.projectId}
        onChange={(e) => onChange({ ...filter, projectId: e.target.value, personId: '' })}>
        <option value="">과제 전체</option>
        {projects.map((p) => <option key={p.id} value={p.id}>{p.short_name}</option>)}
      </select>
      <select aria-label="사람 필터" className={select} value={filter.personId} onChange={(e) => onChange({ ...filter, personId: e.target.value })}>
        <option value="">사람 전체</option>
        {visibleProjects.map((p) => (
          <optgroup key={p.id} label={p.short_name}>
            {people
              .filter((pe) => pe.project_id === p.id)
              .sort((a, b) => (a.role === '연구책임자' ? -1 : 0) - (b.role === '연구책임자' ? -1 : 0))
              .map((pe) => (
                <option key={pe.id} value={pe.id}>{pe.name} ({pe.role})</option>
              ))}
          </optgroup>
        ))}
      </select>
      {(filter.projectId || filter.personId || filter.view !== 'all') && (
        <button onClick={() => onChange({ view: 'all', projectId: '', personId: '' })}
          className="min-h-11 rounded-lg px-3 text-[15px] font-medium text-brand hover:bg-white/70">
          필터 지우기
        </button>
      )}
    </div>
  )
}
