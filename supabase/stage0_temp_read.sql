-- [0단계 임시] 로그인 화면이 아직 없어서, 가짜 데이터를 '읽기만' 하도록 잠깐 열어둔다.
-- 1단계(로그인)를 만들면 아래 drop 문으로 반드시 닫는다.

create policy "stage0 temp read" on projects      for select to anon using (true);
create policy "stage0 temp read" on people        for select to anon using (true);
create policy "stage0 temp read" on expenses      for select to anon using (true);
create policy "stage0 temp read" on required_docs for select to anon using (true);

-- 1단계에서 실행할 것:
-- drop policy "stage0 temp read" on projects;
-- drop policy "stage0 temp read" on people;
-- drop policy "stage0 temp read" on expenses;
-- drop policy "stage0 temp read" on required_docs;
