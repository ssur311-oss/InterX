-- 0008. 증빙 파일 보관함 (F8). 여러 번 실행해도 안전
-- 파일은 비공개 저장소 'evidence'에 집행 건별 폴더로 저장한다. 로그인한 관리자만 올리고 볼 수 있다.
-- 감사 소명 근거라 지우기는 허용하지 않는다 (RULE.md 0-4). 표준 파일명은 required_docs.renamed_file_name에 둔다.

insert into storage.buckets (id, name, public)
values ('evidence', 'evidence', false)
on conflict (id) do nothing;

drop policy if exists "evidence read" on storage.objects;
create policy "evidence read" on storage.objects
  for select to authenticated using (bucket_id = 'evidence');

drop policy if exists "evidence upload" on storage.objects;
create policy "evidence upload" on storage.objects
  for insert to authenticated with check (bucket_id = 'evidence');
