-- 0003. [1단계] 0단계에서 임시로 열어둔 '로그인 없이 읽기'를 닫는다.
-- 이제 로그인한 관리자만 모든 표를 읽고 쓸 수 있다.
drop policy if exists "stage0 temp read" on projects;
drop policy if exists "stage0 temp read" on people;
drop policy if exists "stage0 temp read" on expenses;
drop policy if exists "stage0 temp read" on required_docs;
