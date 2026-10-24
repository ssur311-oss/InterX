import { isSupabaseConfigured } from './lib/supabase'
import Dashboard from './pages/Dashboard'

export default function App() {
  if (!isSupabaseConfigured) {
    return (
      <main className="mx-auto max-w-xl p-6">
        <h1 className="text-xl font-bold">Supabase 연결 정보가 아직 없어요</h1>
        <p className="mt-2 text-gray-700">
          프로젝트 폴더의 <code>.env</code> 파일에 Supabase 주소와 키를 넣은 뒤, 실행 중인 창을 껐다가 다시 켜 주세요.
        </p>
      </main>
    )
  }
  return (
    <div className="min-h-screen bg-gray-50">
      <Dashboard />
    </div>
  )
}
