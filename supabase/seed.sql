-- 가짜 데이터 (CLAUDE.md 11장). 실제 회사·실명 아님.
-- 과제 3개, 사람 7명, 2026년 10월 집행 40건
-- 일부러 섞은 것: 증빙 누락 6건, 제출 예정 5건(약속일 경과 2건), 주말 1건, 분할 결제 의심 1건, 과제 기간 외 1건

insert into projects (name, short_name, agency, start_date, end_date, settlement_deadline) values
  ('자율제조 AI 플랫폼 고도화',     '자율제조', '가상산업기술진흥원', '2026-04-01', '2026-12-31', '2026-11-13'),
  ('제조 LLM 실증',                 '제조LLM',  '가상정보통신진흥원', '2026-03-01', '2027-02-28', '2026-11-13'),
  -- 10/15에 끝난 과제: 10/20 집행 건이 '과제 기간 외'가 된다
  ('스마트팩토리 데이터 표준화',    '데이터표준','가상산업기술진흥원', '2025-11-01', '2026-10-15', '2026-11-16');

insert into people (name, department, project_id, role, slack_user_id)
select p.name, p.department, pr.id, p.role, p.slack_user_id
from (values
  ('김민준', 'AI연구팀',     '자율제조',   '연구책임자', 'U00000001'),
  ('최지우', 'AI연구팀',     '자율제조',   '참여연구원', 'U00000002'),
  ('정하준', '제어개발팀',   '자율제조',   '참여연구원', 'U00000003'),
  ('이서연', 'LLM연구팀',    '제조LLM',    '연구책임자', 'U00000004'),
  ('강서윤', 'LLM연구팀',    '제조LLM',    '참여연구원', 'U00000005'),
  ('박도윤', '데이터팀',     '데이터표준', '연구책임자', 'U00000006'),
  ('윤지호', '데이터팀',     '데이터표준', '참여연구원', 'U00000007')
) as p(name, department, short_name, role, slack_user_id)
join projects pr on pr.short_name = p.short_name;

insert into expenses (project_id, category, sub_category, pay_method, amount, paid_at, vendor, description, owner_id)
select pr.id, e.category, e.sub_category, e.pay_method, e.amount, (e.paid_at || '+09')::timestamptz, e.vendor, e.description, pe.id
from (values
  -- 자율제조
  ('자율제조', '연구재료비',     null,     'card',       450000, '2026-10-01 10:20', '가람전자',   '센서 케이블 구매',            '최지우'),
  ('자율제조', '연구재료비',     null,     'transfer',  2300000, '2026-10-14 14:05', '누리부품',   '센서 부품 구매',              '정하준'),
  ('자율제조', '연구활동비',     '회의비', 'card',       128000, '2026-10-21 12:30', '라온식당',   '기술 회의 식대',              '김민준'),
  ('자율제조', '연구활동비',     '출장비', 'card',       386000, '2026-10-07 08:10', '하늘고속',   '대전 실증 현장 출장',         '최지우'),
  ('자율제조', '연구시설장비비', null,     'transfer', 18500000, '2026-10-02 15:00', '아라정밀',   '엣지 서버 구매',              '김민준'),
  ('자율제조', '위탁·외주용역',  null,     'transfer', 12000000, '2026-10-16 11:00', '자람컨설팅', '데이터 라벨링 외주',          '김민준'),
  ('자율제조', '연구재료비',     null,     'card',      1200000, '2026-10-13 10:15', '바른공구',   '측정 공구 세트 구매(1)',      '정하준'), -- 분할 결제 의심
  ('자율제조', '연구재료비',     null,     'card',      1100000, '2026-10-13 10:22', '바른공구',   '측정 공구 세트 구매(2)',      '정하준'), -- 분할 결제 의심
  ('자율제조', '연구활동비',     '회의비', 'card',        96000, '2026-10-08 18:40', '마루카페',   '외부 자문 회의 다과',         '정하준'),
  ('자율제조', '연구재료비',     null,     'card',        87000, '2026-10-19 13:30', '가람전자',   '점퍼 와이어 구매',            '최지우'),
  ('자율제조', '연구활동비',     '출장비', 'transfer',   520000, '2026-10-22 09:00', '하늘여행사', '부산 고객사 출장 숙박',       '정하준'),
  ('자율제조', '연구재료비',     null,     'transfer',  3400000, '2026-10-20 16:20', '다온테크',   'PLC 모듈 구매',               '최지우'),
  ('자율제조', '연구활동비',     '회의비', 'card',       210000, '2026-10-17 12:10', '라온식당',   '주말 워크숍 식대',            '김민준'), -- 토요일
  ('자율제조', '연구재료비',     null,     'card',        64000, '2026-10-23 11:00', '새솔문구',   '실험노트 구매',               '최지우'),
  ('자율제조', '연구재료비',     null,     'card',       142000, '2026-10-06 15:40', '바른공구',   '지그 제작 자재',              '최지우'),
  -- 제조LLM
  ('제조LLM',  '연구재료비',     null,     'card',       990000, '2026-10-02 14:00', '가람전자',   '테스트용 SSD 구매',           '강서윤'),
  ('제조LLM',  '연구재료비',     null,     'transfer',  4200000, '2026-10-06 10:30', '누리부품',   'GPU 메모리 증설 부품',        '이서연'),
  ('제조LLM',  '연구활동비',     '회의비', 'card',       154000, '2026-10-12 12:20', '라온식당',   'LLM 평가 회의 식대',          '이서연'),
  ('제조LLM',  '연구활동비',     '출장비', 'card',       298000, '2026-10-15 07:50', '하늘고속',   '광주 실증 기업 출장',         '강서윤'),
  ('제조LLM',  '연구시설장비비', null,     'transfer', 25000000, '2026-10-06 13:00', '아라정밀',   'GPU 워크스테이션 구매',       '이서연'),
  ('제조LLM',  '위탁·외주용역',  null,     'transfer',  8800000, '2026-10-20 15:30', '자람컨설팅', '평가 데이터셋 구축 외주',     '이서연'),
  ('제조LLM',  '연구재료비',     null,     'card',       132000, '2026-10-08 16:10', '바른공구',   '랙 마운트 키트',              '강서윤'),
  ('제조LLM',  '연구활동비',     '회의비', 'card',        88000, '2026-10-14 17:30', '마루카페',   '프롬프트 리뷰 회의 다과',     '강서윤'),
  ('제조LLM',  '연구재료비',     null,     'card',       245000, '2026-10-16 11:40', '가람전자',   '네트워크 스위치 구매',        '강서윤'),
  ('제조LLM',  '연구활동비',     '출장비', 'transfer',   410000, '2026-10-23 09:30', '하늘여행사', '울산 공장 출장 숙박',         '이서연'),
  ('제조LLM',  '연구재료비',     null,     'transfer',  1750000, '2026-10-21 14:50', '다온테크',   '산업용 카메라 구매',          '강서윤'),
  ('제조LLM',  '연구활동비',     '회의비', 'card',       176000, '2026-10-22 12:40', '라온식당',   '실증 기업 미팅 식대',         '이서연'),
  ('제조LLM',  '연구재료비',     null,     'card',        58000, '2026-10-02 10:00', '새솔문구',   '라벨 프린터 소모품',          '강서윤'),
  ('제조LLM',  '연구활동비',     '회의비', 'card',        99000, '2026-10-07 17:10', '마루카페',   '모델 튜닝 회의 다과',         '강서윤'),
  -- 데이터표준 (과제 종료 10/15)
  ('데이터표준','연구재료비',    null,     'card',       340000, '2026-10-06 11:20', '가람전자',   '데이터 수집 센서 구매',       '윤지호'),
  ('데이터표준','연구재료비',    null,     'transfer',  2900000, '2026-10-07 15:10', '누리부품',   '게이트웨이 장비 부품',        '박도윤'),
  ('데이터표준','연구활동비',    '회의비', 'card',       112000, '2026-10-06 12:00', '라온식당',   '표준안 검토 회의 식대',       '박도윤'),
  ('데이터표준','연구활동비',    '출장비', 'card',       265000, '2026-10-08 08:30', '하늘고속',   '창원 실증 현장 출장',         '윤지호'),
  ('데이터표준','위탁·외주용역', null,     'transfer',  6500000, '2026-10-08 16:00', '자람컨설팅', '표준 문서화 외주',            '박도윤'),
  ('데이터표준','연구재료비',    null,     'card',        76000, '2026-10-12 13:10', '새솔문구',   '현장 점검표 인쇄',            '윤지호'),
  ('데이터표준','연구활동비',    '회의비', 'card',        92000, '2026-10-13 18:20', '마루카페',   '최종 보고 준비 회의 다과',    '윤지호'),
  ('데이터표준','연구재료비',    null,     'card',       188000, '2026-10-14 10:40', '바른공구',   '케이블 정리 자재',            '윤지호'),
  ('데이터표준','연구활동비',    '회의비', 'card',       145000, '2026-10-20 12:30', '라온식당',   '종료 후 결과 공유 회의 식대', '박도윤'), -- 과제 기간 외
  ('데이터표준','연구재료비',    null,     'transfer',  1300000, '2026-10-02 14:30', '다온테크',   '통신 모듈 구매',              '박도윤'),
  ('데이터표준','연구활동비',    '출장비', 'transfer',   380000, '2026-10-15 09:00', '하늘여행사', '포항 현장 출장 숙박',         '윤지호')
) as e(short_name, category, sub_category, pay_method, amount, paid_at, vendor, description, owner_name)
join projects pr on pr.short_name = e.short_name
join people pe on pe.name = e.owner_name;

-- 규칙표대로 필요 증빙을 만들고, 기본은 '제출 완료'로 둔다
insert into required_docs (expense_id, doc_type, status)
select ex.id, r.doc_type, 'submitted'
from expenses ex
join doc_rules r
  on r.category = ex.category
 and r.sub_category is not distinct from ex.sub_category
 and r.pay_method = ex.pay_method;

-- 증빙 누락 6건
update required_docs d set status = 'missing'
from expenses ex
where d.expense_id = ex.id and (ex.description, d.doc_type) in (
  ('센서 부품 구매',          '세금계산서'),
  ('센서 부품 구매',          '검수조서'),
  ('기술 회의 식대',          '회의록'),
  ('LLM 평가 회의 식대',      '참석자 명단'),
  ('평가 데이터셋 구축 외주', '결과물'),
  ('게이트웨이 장비 부품',    '거래명세서')
);

-- 제출 예정 5건 (예정일은 실행한 날 기준: 2건은 이미 지남, 1건은 사내 마감을 넘김)
update required_docs d set status = 'scheduled', planned_date = v.planned
from expenses ex,
  (values
    ('PLC 모듈 구매',         '세금계산서',     current_date - 3),
    ('울산 공장 출장 숙박',   '출장결과보고서', current_date - 1),
    ('데이터 라벨링 외주',    '결과물',         current_date + 3),
    ('산업용 카메라 구매',    '검수조서',       current_date + 5),
    ('부산 고객사 출장 숙박', '출장결과보고서', current_date + 20)
  ) as v(description, doc_type, planned)
where d.expense_id = ex.id and ex.description = v.description and d.doc_type = v.doc_type;

-- 제출 예정 건마다 슬랙에서 받은 연락을 처리 이력으로 남겨둔다
insert into activity_log (expense_id, doc_id, kind, content, source, created_at)
select d.expense_id, d.id, 'delay_notice', v.content, 'slack_paste', now() - interval '5 days'
from required_docs d
join expenses ex on ex.id = d.expense_id
join (values
  ('PLC 모듈 구매',         '거래처 세금계산서 발행이 늦어진다고 함'),
  ('울산 공장 출장 숙박',   '출장결과보고서 작성 중, 며칠 내 제출 예정'),
  ('데이터 라벨링 외주',    '외주 결과물 최종본 검토 중'),
  ('산업용 카메라 구매',    '장비 설치 후 검수조서 작성 예정'),
  ('부산 고객사 출장 숙박', '추가 출장 일정 끝나고 함께 보고서 제출 예정')
) as v(description, content) on v.description = ex.description
where d.status = 'scheduled';

-- 예산 (F10용): 계획액은 임의값, 집행액은 위 집행 건 합계
insert into budget_items (project_id, category, planned_amount, spent_amount)
select pr.id, c.category, c.planned,
  coalesce((select sum(amount) from expenses ex where ex.project_id = pr.id and ex.category = c.category), 0)
from projects pr
cross join (values
  ('연구재료비',      30000000),
  ('연구활동비',      10000000),
  ('연구시설장비비',  60000000),
  ('위탁·외주용역',   40000000)
) as c(category, planned);
