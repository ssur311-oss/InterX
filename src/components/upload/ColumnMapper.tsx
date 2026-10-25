import { UPLOAD_FIELDS, type ColumnMap } from '../../lib/upload/parseSheet'

type Props = { headers: string[]; map: ColumnMap; onChange: (map: ColumnMap) => void }

export function ColumnMapper({ headers, map, onChange }: Props) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {UPLOAD_FIELDS.map((f) => (
        <label key={f.key} className="text-sm">
          <span className="font-medium">
            {f.label}
            {f.required && <span className="text-red-600"> *</span>}
          </span>
          <select
            value={map[f.key] ?? ''}
            onChange={(e) => onChange({ ...map, [f.key]: e.target.value === '' ? null : Number(e.target.value) })}
            className={`mt-1 w-full rounded border px-2 py-1.5 ${
              f.required && map[f.key] === null ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white'
            }`}
          >
            <option value="">— 안 씀 —</option>
            {headers.map((h, i) => (
              <option key={i} value={i}>{h || `(${i + 1}번째 열)`}</option>
            ))}
          </select>
        </label>
      ))}
    </div>
  )
}

export function missingRequiredColumns(map: ColumnMap): string[] {
  return UPLOAD_FIELDS.filter((f) => f.required && map[f.key] === null).map((f) => f.label)
}
