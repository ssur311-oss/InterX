import { NavLink, Outlet } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const MENU = [
  { to: '/', label: '현황판' },
  { to: '/upload', label: '엑셀 업로드' },
  { to: '/settings', label: '설정' },
]

export function Layout({ email }: { email: string }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-6 py-3">
          <span className="font-bold">증빙 마감 도우미</span>
          <nav className="flex gap-1">
            {MENU.map((m) => (
              <NavLink key={m.to} to={m.to} end
                className={({ isActive }) => `rounded px-3 py-1.5 text-sm ${isActive ? 'bg-blue-50 font-semibold text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}>
                {m.label}
              </NavLink>
            ))}
          </nav>
          <span className="ml-auto hidden text-sm text-gray-500 sm:inline">{email}</span>
          <button onClick={() => supabase?.auth.signOut()} className="rounded px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100">
            로그아웃
          </button>
        </div>
      </header>
      <Outlet />
    </div>
  )
}
