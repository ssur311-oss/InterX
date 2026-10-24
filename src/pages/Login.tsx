import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!supabase) return
    setBusy(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setBusy(false)
    if (error) setError('이메일 또는 비밀번호가 맞지 않아요.')
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
      <form onSubmit={submit} className="w-full max-w-sm rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-bold">증빙 마감 도우미</h1>
        <p className="mt-1 text-sm text-gray-600">관리자 계정으로 로그인하세요.</p>
        <label className="mt-5 block text-sm font-medium">
          이메일
          <input type="email" required autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2" />
        </label>
        <label className="mt-3 block text-sm font-medium">
          비밀번호
          <input type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2" />
        </label>
        {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
        <button type="submit" disabled={busy}
          className="mt-5 w-full rounded bg-blue-600 py-2 font-medium text-white disabled:bg-gray-300">
          {busy ? '확인 중…' : '로그인'}
        </button>
      </form>
    </main>
  )
}
