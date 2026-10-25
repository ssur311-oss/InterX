-- 0007. [시험용] 종 알림 확인: 반복 일정 표(0006과 같음, 이미 있으면 그대로) + 이번 주 수요일 기한 일정 1개
-- 매월 반복되는 마감, 급여(인건비) 정산일, 감사·점검 같은 일정과 그때 필요한 준비 서류를 둔다.
-- 날짜와 서류 이름만 다룬다. 급여 금액·개인정보는 넣지 않는다 (RULE.md 0-3).

create table if not exists schedules (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  kind         text not null default '마감' check (kind in ('마감', '급여', '감사', '보고', '기타')),
  repeat       text not null default 'monthly' check (repeat in ('once', 'monthly', 'quarterly', 'yearly')),
  base_date    date not null,               -- 첫 날짜. 반복이면 이 날짜의 '일'(과 달)을 기준으로 되풀이
  docs         text,                        -- 준비 서류, 쉼표로 구분
  remind_days  int  not null default 7,     -- 며칠 전부터 종 알림에 띄울지
  project_id   uuid references projects(id),
  created_at   timestamptz not null default now()
);

alter table schedules enable row level security;
drop policy if exists "admin all" on schedules;
create policy "admin all" on schedules for all to authenticated using (true) with check (true);

-- ↓ 시험용 알림 1개: 이번 주 수요일(2026-10-28) 기한. 같은 이름이 이미 있으면 다시 넣지 않는다
insert into schedules (title, kind, repeat, base_date, docs, remind_days)
select '10월 증빙 사내 점검 (시험)', '마감', 'once', date '2026-10-28', '미제출 증빙 목록, 약속일 경과 건 사유, 변동 사항 확인서', 7
where not exists (select 1 from schedules where title = '10월 증빙 사내 점검 (시험)');
