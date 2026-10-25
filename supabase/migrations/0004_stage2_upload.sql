-- 0004. [2단계] 엑셀 업로드·위험 건 표시에 필요한 것 (여러 번 실행해도 안전)

-- 규칙표에 없는 조합이면 표시 ("규칙 없음 — 확인 필요", RULE.md 1장)
alter table expenses add column if not exists no_rule boolean not null default false;

-- 같은 집행 건에 같은 위험 표시가 두 번 생기지 않게
create unique index if not exists risk_flags_expense_rule on risk_flags (expense_id, rule_code);

-- 주말 외 공휴일 (주말·공휴일 사용 판정, 마감일 계산에 사용). 예시값이므로 매년 설정 화면에서 확인한다.
insert into settings (key, value, label) values (
  'holidays',
  '2026-01-01,2026-02-16,2026-02-17,2026-02-18,2026-03-01,2026-03-02,2026-05-05,2026-05-24,2026-05-25,2026-06-03,2026-06-06,2026-08-15,2026-08-17,2026-09-24,2026-09-25,2026-09-26,2026-09-28,2026-10-03,2026-10-05,2026-10-09,2026-12-25,2027-01-01,2027-02-06,2027-02-07,2027-02-08,2027-02-09',
  '공휴일 (YYYY-MM-DD, 쉼표로 구분) — 매년 확인'
) on conflict (key) do nothing;

-- 가짜 데이터 보정: 10/5(개천절 대체공휴일)에 넣었던 3건을 평일로 옮긴다 (주말 사용은 1건만 의도)
update expenses set paid_at = '2026-10-06 15:40+09' where description = '지그 제작 자재'         and paid_at = '2026-10-05 15:40+09';
update expenses set paid_at = '2026-10-06 13:00+09' where description = 'GPU 워크스테이션 구매'  and paid_at = '2026-10-05 13:00+09';
update expenses set paid_at = '2026-10-07 15:10+09' where description = '게이트웨이 장비 부품'   and paid_at = '2026-10-05 15:10+09';
