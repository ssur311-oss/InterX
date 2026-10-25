import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { todaySeoul } from '../lib/date'
import { supabase } from '../lib/supabase'

// 메뉴 구성은 design/wireframe-plan.md "페이지 분류" 기준
const WORK_MENU = [
  { to: '/', icon: '⌂', label: '오늘 할 일' },
  { to: '/calendar', icon: '▦', label: '마감 캘린더' },
  { to: '/upload', icon: '▤', label: '엑셀 등록' },
]
const ADMIN_MENU = [{ to: '/settings', icon: '⚙', label: '설정' }]
const ALL_MENU = [...WORK_MENU, ...ADMIN_MENU]

function MenuLink({ to, icon, label }: { to: string; icon: string; label: string }) {
  return (
    <NavLink
      to={to}
      end
      className={({ isActive }) =>
        `flex min-h-12 shrink-0 items-center gap-4 rounded-lg px-4 text-base md:mb-2 ${
          isActive ? 'bg-canvas font-extrabold shadow-[inset_3px_0_var(--color-brand)]' : 'text-ink hover:bg-canvas'
        }`
      }
    >
      <span aria-hidden className="w-5 text-center text-xl">{icon}</span>
      {label}
    </NavLink>
  )
}

export function Layout({ email }: { email: string }) {
  const { pathname } = useLocation()
  const current = ALL_MENU.find((m) => m.to === pathname)?.label ?? ''
  const [year, month] = todaySeoul().split('-').map(Number)

  return (
    <div className="min-h-screen md:grid md:grid-cols-[216px_1fr]">
      <aside className="border-b border-line bg-white md:sticky md:top-0 md:flex md:h-screen md:flex-col md:border-r md:border-b-0 md:px-4 md:py-8">
        <div className="hidden px-2 pb-8 md:block">
          <div className="text-xl font-extrabold tracking-tight">증빙 마감 도우미</div>
          <div className="mt-2 text-[13px] text-body">매달의 증빙, 빠짐없이</div>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-2 py-2 md:block md:p-0">
          {WORK_MENU.map((m) => <MenuLink key={m.to} {...m} />)}
          <div className="hidden px-4 pt-6 pb-2 text-[13px] text-body md:block">관리</div>
          {ADMIN_MENU.map((m) => <MenuLink key={m.to} {...m} />)}
        </nav>
        <div className="mt-auto hidden px-2 pt-6 text-[13px] text-body md:block">
          <div className="truncate">{email}</div>
          <button onClick={() => supabase?.auth.signOut()} className="mt-2 min-h-12 w-full rounded-lg border border-line bg-white px-4 text-left text-base text-ink hover:border-body">
            로그아웃
          </button>
          <p className="mt-3">데모용 가짜 데이터입니다</p>
        </div>
      </aside>

      <main className="min-w-0">
        <div className="flex h-[72px] items-center justify-between border-b border-line bg-white px-6 text-[13px] md:px-8">
          <strong className="text-base">{current}</strong>
          <div className="flex items-center gap-4">
            <span className="text-body">{year}년 {month}월 기준</span>
            <button onClick={() => supabase?.auth.signOut()} className="rounded px-2 py-1 text-body hover:bg-canvas md:hidden">로그아웃</button>
          </div>
        </div>
        <Outlet />
      </main>
    </div>
  )
}
