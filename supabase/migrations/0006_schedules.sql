-- 0006. 반복·고정 일정 (마감 캘린더 + 종 알림). 여러 번 실행해도 안전
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

-- 예시 기본값 (설정 > 반복 일정에서 고친다)
insert into schedules (title, kind, repeat, base_date, docs, remind_days)
select * from (values
  ('집행 내역 엑셀 등록', '마감', 'monthly', date '2026-01-05', '연구비 시스템 집행 내역 엑셀, 카드사 사용 내역', 3),
  ('인건비(급여) 정산', '급여', 'monthly', date '2026-01-10', '급여 이체 확인증, 참여율 확인서', 5),
  ('법인카드 사용 내역 마감', '마감', 'monthly', date '2026-01-25', '카드전표, 영수증, 사용 목적 메모', 5),
  ('분기 집행 점검', '감사', 'quarterly', date '2026-01-31', '분기 집행 내역, 증빙 철, 위험 건 소명 내역', 14),
  ('연차 실적·정산 보고', '보고', 'yearly', date '2026-12-15', '연차 실적 보고서, 사업비 정산 보고서, 증빙 목록', 30)
) as v(title, kind, repeat, base_date, docs, remind_days)
where not exists (select 1 from schedules);
