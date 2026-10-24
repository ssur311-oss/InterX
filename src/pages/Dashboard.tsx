import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { formatDate, formatWon } from '../lib/format'
import { StatusBadge, type DocStatus } from '../components/StatusBadge'

type ExpenseRow = {
  id: string
  category: string
  sub_category: string | null
  pay_method: 'card' | 'transfer'
  amount: number
  paid_at: string
  vendor: string | null
  description: string | null
  projects: { short_name: string } | null
  people: { name: string } | null
  required_docs: { id: string; doc_type: string; status: DocStatus }[]
}

export default function Dashboard() {
  const [rows, setRows] = useState<ExpenseRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!supabase) return
    supabase
      .from('expenses')
      .select('id, category, sub_category, pay_method, amount, paid_at, vendor, description, projects(short_name), people(name), required_docs(id, doc_type, status)')
      .order('paid_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) setError(error.message)
        else setRows((data ?? []) as unknown as ExpenseRow[])
        setLoading(false)
      })
  }, [])

  if (loading) return <p className="p-6 text-gray-500">불러오는 중…</p>
  if (error) return <p className="p-6 text-red-700">데이터를 불러오지 못했어요: {error}</p>

  const docs = rows.flatMap((r) => r.required_docs)
  const count = (s: DocStatus) => docs.filter((d) => d.status === s).length

  return (
    <main className="mx-auto max-w-6xl p-6">
      <h1 className="text-2xl font-bold">증빙 현황판</h1>
      <p className="mt-1 text-sm text-gray-600">
        집행 {rows.length}건 · 증빙 {docs.length}개 — ✅ {count('submitted')} · ⏳ {count('scheduled')} · ❌ {count('missing')}
      </p>

      <div className="mt-4 overflow-x-auto rounded border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-600">
            <tr>
              <th className="px-3 py-2">집행일</th>
              <th className="px-3 py-2">과제</th>
              <th className="px-3 py-2">비목</th>
              <th className="px-3 py-2">내용</th>
              <th className="px-3 py-2 text-right">금액</th>
              <th className="px-3 py-2">사용자</th>
              <th className="px-3 py-2">증빙</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-gray-100 align-top">
                <td className="whitespace-nowrap px-3 py-2">{formatDate(r.paid_at)}</td>
                <td className="whitespace-nowrap px-3 py-2">{r.projects?.short_name}</td>
                <td className="whitespace-nowrap px-3 py-2">
                  {r.category}
                  {r.sub_category && <span className="text-gray-500"> / {r.sub_category}</span>}
                </td>
                <td className="px-3 py-2">
                  {r.description}
                  <div className="text-xs text-gray-500">
                    {r.vendor} · {r.pay_method === 'card' ? '카드' : '계좌이체'}
                  </div>
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-right">{formatWon(r.amount)}</td>
                <td className="whitespace-nowrap px-3 py-2">{r.people?.name}</td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-1">
                    {r.required_docs.map((d) => (
                      <StatusBadge key={d.id} docType={d.doc_type} status={d.status} />
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  )
}
