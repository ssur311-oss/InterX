import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { isSupabaseConfigured, supabase } from './lib/supabase'
import { Layout } from './components/Layout'
import Assistant from './pages/Assistant'
import Calendar from './pages/Calendar'
import Checklist from './pages/Checklist'
import Dashboard from './pages/Dashboard'
import Login from './pages/Login'
import Settings from './pages/Settings'
import Upload from './pages/Upload'

function NotConfigured() {
  return (
    <main className="mx-auto max-w-xl p-6">
      <h1 className="text-xl font-bold">Supabase 연결 정보가 아직 없어요</h1>
      <p className="mt-2 text-body">
        프로젝트 폴더의 <code>.env</code> 파일에 Supabase 주소와 키를 넣은 뒤, 실행 중인 창을 껐다가 다시 켜 주세요.
      </p>
    </main>
  )
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setChecking(false)
    })
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  if (!isSupabaseConfigured) return <NotConfigured />
  if (checking) return null
  if (!session) return <Login />

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout email={session.user.email ?? ''} />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/checklist" element={<Checklist />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/upload" element={<Upload />} />
          <Route path="/assistant" element={<Assistant />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
