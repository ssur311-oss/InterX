-- 0001. 테이블 생성 (CLAUDE.md 8장 데이터 구조)
-- 금액은 원 단위 정수(bigint), 날짜는 date, 집행일시는 timestamptz(Asia/Seoul 기준으로 입력)

create extension if not exists pgcrypto;

create table projects (
  id                    uuid primary key default gen_random_uuid(),
  name                  text not null,
  short_name            text not null,            -- 파일명용 약칭
  agency                text,
  start_date            date not null,
  end_date              date not null,
  settlement_deadline   date,                     -- 정산 기한
  internal_buffer_days  int  not null default 5,  -- 사내 마감 여유일(영업일)
  created_at            timestamptz not null default now()
);

create table people (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  department     text,
  project_id     uuid references projects(id),
  role           text not null check (role in ('연구책임자', '참여연구원')),
  slack_user_id  text,
  created_at     timestamptz not null default now()
);

create table budget_items (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid not null references projects(id),
  category        text not null,
  planned_amount  bigint not null default 0,
  spent_amount    bigint not null default 0
);

create table expenses (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid not null references projects(id),
  category      text not null,                    -- 비목
  sub_category  text,                             -- 세목 (예: 회의비)
  pay_method    text not null check (pay_method in ('card', 'transfer')),
  amount        bigint not null check (amount >= 0),
  paid_at       timestamptz not null,
  vendor        text,                             -- 거래처
  description   text,                             -- 적요
  owner_id      uuid references people(id),
  created_at    timestamptz not null default now()
);

-- F1 규칙표: 비목·세목 × 결제 방법 → 필요 증빙
create table doc_rules (
  id            uuid primary key default gen_random_uuid(),
  category      text not null,
  sub_category  text,
  pay_method    text not null check (pay_method in ('card', 'transfer')),
  doc_type      text not null,
  required      boolean not null default true,
  sort_order    int not null default 0
);

create table required_docs (
  id                 uuid primary key default gen_random_uuid(),
  expense_id         uuid not null references expenses(id) on delete cascade,
  doc_type           text not null,
  -- '약속일 경과', '마감 넘는 예정'은 저장하지 않고 화면에서 계산 (RULE.md 4장)
  status             text not null default 'missing' check (status in ('submitted', 'scheduled', 'missing')),
  planned_date       date,
  file_path          text,
  renamed_file_name  text,
  created_at         timestamptz not null default now()
);

create table risk_flags (
  id          uuid primary key default gen_random_uuid(),
  expense_id  uuid not null references expenses(id) on delete cascade,
  rule_code   text not null check (rule_code in ('WEEKEND', 'LATE_NIGHT', 'SPLIT', 'OUT_OF_PERIOD', 'MEETING_LIMIT')),
  detail      text,
  resolved    boolean not null default false,       -- 관리자 "소명 완료" 표시
  created_at  timestamptz not null default now()
);

create table activity_log (
  id          uuid primary key default gen_random_uuid(),
  expense_id  uuid references expenses(id),
  doc_id      uuid references required_docs(id),
  kind        text not null check (kind in ('delay_notice', 'submitted', 'notice_sent', 're_notice_sent', 'memo')),
  content     text not null,
  source      text not null check (source in ('slack_paste', 'manual', 'system')),
  created_at  timestamptz not null default now()
);

create table settings (
  key    text primary key,
  value  text not null,
  label  text                                       -- 설정 화면에 보여줄 설명
);

-- 처리 이력은 감사 소명 근거라 수정·삭제를 DB에서 막는다 (RULE.md 0-4)
create function forbid_activity_log_change() returns trigger
language plpgsql as $$
begin
  raise exception '처리 이력은 수정하거나 지울 수 없습니다. 새 이력을 추가하세요.';
end;
$$;

create trigger activity_log_no_update_delete
  before update or delete on activity_log
  for each row execute function forbid_activity_log_change();

-- 보안: 모든 테이블에 행 단위 보안(RLS)을 켜고, 로그인한 관리자만 읽고 쓸 수 있게 한다
alter table projects       enable row level security;
alter table people         enable row level security;
alter table budget_items   enable row level security;
alter table expenses       enable row level security;
alter table doc_rules      enable row level security;
alter table required_docs  enable row level security;
alter table risk_flags     enable row level security;
alter table activity_log   enable row level security;
alter table settings       enable row level security;

create policy "admin all" on projects      for all to authenticated using (true) with check (true);
create policy "admin all" on people        for all to authenticated using (true) with check (true);
create policy "admin all" on budget_items  for all to authenticated using (true) with check (true);
create policy "admin all" on expenses      for all to authenticated using (true) with check (true);
create policy "admin all" on doc_rules     for all to authenticated using (true) with check (true);
create policy "admin all" on required_docs for all to authenticated using (true) with check (true);
create policy "admin all" on risk_flags    for all to authenticated using (true) with check (true);
create policy "admin all" on settings      for all to authenticated using (true) with check (true);
create policy "admin read"   on activity_log for select to authenticated using (true);
create policy "admin insert" on activity_log for insert to authenticated with check (true);
