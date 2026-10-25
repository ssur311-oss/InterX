-- 0005. [시연용] 가짜 데이터의 '등록한 날'을 나눠 준다 (여러 번 실행해도 결과 같음)
-- 가짜 데이터 40건은 한 번에 넣어서 등록일이 모두 같다. 그러면 증빙 체크리스트의 날짜 구간이 하나뿐이다.
-- "매주 월요일 아침 9시에 그 전 주 집행 내역 엑셀을 올렸다"고 가정해 등록일을 바꾼다.
-- 아직 오지 않은 월요일이면 지금 시각으로 둔다 (오늘 들어온 건).
-- 앱에서 엑셀로 직접 올린 건은 바꾸지 않는다: 가짜 데이터를 넣은 그 시각(가장 이른 등록 시각)의 건만 바꾼다.

update expenses
set created_at = least(
  (date_trunc('week', paid_at at time zone 'Asia/Seoul') + interval '7 days 9 hours') at time zone 'Asia/Seoul',
  now()
)
where created_at = (select min(created_at) from expenses);
