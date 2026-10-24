-- 0002. 기본 증빙 규칙표 + 기본 설정값 (RULE.md 1~3장의 예시 값)
-- 실제 값은 과제 협약·전문기관 지침에 맞춰 설정 화면에서 바꾼다.

insert into doc_rules (category, sub_category, pay_method, doc_type, sort_order) values
  ('연구재료비',     null,     'card',     '카드전표',         1),
  ('연구재료비',     null,     'card',     '거래명세서',       2),
  ('연구재료비',     null,     'card',     '검수조서',         3),
  ('연구재료비',     null,     'transfer', '세금계산서',       1),
  ('연구재료비',     null,     'transfer', '거래명세서',       2),
  ('연구재료비',     null,     'transfer', '검수조서',         3),
  ('연구활동비',     '회의비', 'card',     '카드전표',         1),
  ('연구활동비',     '회의비', 'card',     '회의록',           2),
  ('연구활동비',     '회의비', 'card',     '참석자 명단',      3),
  ('연구활동비',     '출장비', 'card',     '출장신청서',       1),
  ('연구활동비',     '출장비', 'card',     '출장결과보고서',   2),
  ('연구활동비',     '출장비', 'card',     '교통·숙박 증빙',   3),
  ('연구활동비',     '출장비', 'transfer', '출장신청서',       1),
  ('연구활동비',     '출장비', 'transfer', '출장결과보고서',   2),
  ('연구활동비',     '출장비', 'transfer', '교통·숙박 증빙',   3),
  ('연구시설장비비', null,     'transfer', '견적서',           1),
  ('연구시설장비비', null,     'transfer', '계약서',           2),
  ('연구시설장비비', null,     'transfer', '세금계산서',       3),
  ('연구시설장비비', null,     'transfer', '검수조서',         4),
  ('연구시설장비비', null,     'transfer', '사진',             5),
  ('위탁·외주용역',  null,     'transfer', '계약서',           1),
  ('위탁·외주용역',  null,     'transfer', '세금계산서',       2),
  ('위탁·외주용역',  null,     'transfer', '결과물',           3),
  ('위탁·외주용역',  null,     'transfer', '검수확인서',       4);

insert into settings (key, value, label) values
  ('late_night_start',        '23:00',   '심야 사용 시작 시각'),
  ('late_night_end',          '06:00',   '심야 사용 끝 시각'),
  ('split_threshold_amount',  '2000000', '분할 결제 의심 기준 금액(원) — 같은 날·같은 거래처 합계'),
  ('meeting_limit_per_person','50000',   '회의비 1인당 기준 금액(원)'),
  ('remind_days',             '7,3,1',   '사내 마감 전 리마인드 일수'),
  ('re_notice_min_hours',     '24',      '재통보 가능 최소 간격(시간)');
