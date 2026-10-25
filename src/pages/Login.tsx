import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { BTN_PRIMARY } from '../components/ui'

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
    <main className="flex min-h-full items-center justify-center p-5">
      <form onSubmit={submit} className="glass-strong w-full max-w-sm rounded-3xl p-8">
        <img src="/icon.svg" alt="" className="mb-4 h-12 w-12" />
        <h1 className="text-2xl font-bold">증빙 마감 도우미</h1>
        <p className="mt-1 text-body">관리자 계정으로 로그인하세요.</p>
        <label className="mt-6 block font-medium">
          이메일
          <input type="email" required autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)}
            className="mt-2 min-h-12 w-full rounded-lg border border-line bg-white/80 px-4 focus:border-brand" />
        </label>
        <label className="mt-4 block font-medium">
          비밀번호
          <input type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)}
            className="mt-2 min-h-12 w-full rounded-lg border border-line bg-white/80 px-4 focus:border-brand" />
        </label>
        {error && <p className="mt-4 text-danger">{error}</p>}
        <button type="submit" disabled={busy}
          className={`${BTN_PRIMARY} mt-6 w-full`}>
          {busy ? '확인 중…' : '로그인'}
        </button>
      </form>
    </main>
  )
}
