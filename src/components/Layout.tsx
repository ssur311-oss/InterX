import { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { CalendarDays, CircleHelp, FileSpreadsheet, LayoutDashboard, ListChecks, LogOut, Settings, Sparkles } from 'lucide-react'
import { formatDate } from '../lib/format'
import { todaySeoul } from '../lib/date'
import { supabase } from '../lib/supabase'
import { NotificationBell } from './NotificationBell'
import { Onboarding, shouldShowOnboarding } from './Onboarding'

// 매일 쓰는 메뉴 → 가끔 쓰는 메뉴 순
const WORK_MENU = [
  { to: '/', Icon: LayoutDashboard, label: '대시보드' },
  { to: '/checklist', Icon: ListChecks, label: '증빙 체크리스트' },
  { to: '/calendar', Icon: CalendarDays, label: '마감 캘린더' },
  { to: '/upload', Icon: FileSpreadsheet, label: '엑셀 등록' },
  { to: '/assistant', Icon: Sparkles, label: 'AI 도우미' },
]
const ADMIN_MENU = [{ to: '/settings', Icon: Settings, label: '설정' }]
const ALL_MENU = [...WORK_MENU, ...ADMIN_MENU]

function MenuLink({ to, Icon, label }: (typeof ALL_MENU)[number]) {
  return (
    <NavLink
      to={to}
      end
      className={({ isActive }) =>
        `flex min-h-12 shrink-0 items-center gap-3 rounded-xl px-4 text-[15px] md:mb-1 ${
          isActive ? 'bg-white font-semibold text-ink shadow-sm' : 'text-body hover:bg-white/60 hover:text-ink'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <Icon aria-hidden size={20} className={isActive ? 'text-brand' : ''} />
          {label}
        </>
      )}
    </NavLink>
  )
}

export function Layout({ email }: { email: string }) {
  const { pathname } = useLocation()
  const [guide, setGuide] = useState(shouldShowOnboarding)
  const current = ALL_MENU.find((m) => m.to === pathname)?.label ?? ''

  return (
    // 프로그램 창처럼: 화면 전체를 고정하고 오른쪽 작업 영역만 스크롤한다
    <div className="flex h-full flex-col">
      {/* 설치한 앱에서 창 맨 위 검은 제목줄 대신 쓰는 투명한 줄. 끌어서 창을 옮길 수 있다 (index.css .titlebar) */}
      <div className="titlebar" aria-hidden>
        <img src="/icon.svg" alt="" className="h-4 w-4" />
        <span>증빙 마감 도우미</span>
      </div>
    <div className="flex min-h-0 flex-1 flex-col md:flex-row">
      <aside className="glass z-10 md:m-4 md:mr-0 md:flex md:w-[240px] md:shrink-0 md:flex-col md:rounded-3xl md:p-4">
        <div className="hidden items-center gap-3 px-2 pt-2 pb-8 md:flex">
          <img src="/icon.svg" alt="" className="h-10 w-10" />
          <div>
            <div className="text-[17px] leading-tight font-bold tracking-tight">증빙 마감 도우미</div>
            <div className="text-[13px] text-body">매달의 증빙, 빠짐없이</div>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-2 py-2 md:block md:p-0" aria-label="주 메뉴">
          {WORK_MENU.map((m) => <MenuLink key={m.to} {...m} />)}
          <div className="hidden px-4 pt-6 pb-2 text-[13px] text-body md:block">관리</div>
          {ADMIN_MENU.map((m) => <MenuLink key={m.to} {...m} />)}
        </nav>

        <div className="mt-auto hidden space-y-1 pt-6 md:block">
          <button onClick={() => setGuide(true)} className="flex min-h-12 w-full items-center gap-3 rounded-xl px-4 text-[15px] text-body hover:bg-white/60 hover:text-ink">
            <CircleHelp aria-hidden size={20} /> 사용 안내
          </button>
          <div className="rounded-xl bg-white/50 p-3">
            <div className="truncate text-[13px] text-body" title={email}>{email}</div>
            <button onClick={() => supabase?.auth.signOut()} className="mt-1 flex min-h-11 w-full items-center gap-2 rounded-lg text-[15px] text-ink hover:text-brand">
              <LogOut aria-hidden size={18} /> 로그아웃
            </button>
          </div>
          <p className="px-2 pt-2 text-[13px] text-body">데모용 가짜 데이터예요</p>
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col overflow-y-auto">
        <div className="sticky top-0 z-10 flex h-14 shrink-0 items-center justify-between px-5 backdrop-blur-md md:px-8">
          <strong className="text-[15px] text-body">{current}</strong>
          <div className="flex items-center gap-2 text-[15px] text-body">
            <span>오늘 {formatDate(todaySeoul())}</span>
            <NotificationBell />
            <button onClick={() => setGuide(true)} aria-label="사용 안내" className="flex h-11 w-11 items-center justify-center rounded-lg hover:bg-white/60 md:hidden">
              <CircleHelp size={20} aria-hidden />
            </button>
            <button onClick={() => supabase?.auth.signOut()} className="min-h-11 rounded-lg px-3 hover:bg-white/60 md:hidden">로그아웃</button>
          </div>
        </div>
        <Outlet />
      </main>

      {guide && <Onboarding onClose={() => setGuide(false)} />}
    </div>
    </div>
  )
}
