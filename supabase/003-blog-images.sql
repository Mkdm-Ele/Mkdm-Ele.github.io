-- 在现有项目的 SQL Editor 执行一次（先完成 001-blog.sql / 002-owner.sql）。
-- 图片使用公开链接；只有站主可以上传、列出和删除图片。
-- 不删除或修改已有文章；重复运行不会清空图片。
begin;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('blog-images', 'blog-images', true, 6291456,
 array['image/jpeg','image/png','image/webp','image/gif','image/avif'])
on conflict (id) do update set public = excluded.public,
 file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Blog owner uploads images" on storage.objects;
create policy "Blog owner uploads images" on storage.objects for insert to authenticated
 with check (bucket_id = 'blog-images' and (select public.is_blog_admin()));
drop policy if exists "Blog owner lists images" on storage.objects;
create policy "Blog owner lists images" on storage.objects for select to authenticated
 using (bucket_id = 'blog-images' and (select public.is_blog_admin()));
drop policy if exists "Blog owner deletes images" on storage.objects;
create policy "Blog owner deletes images" on storage.objects for delete to authenticated
 using (bucket_id = 'blog-images' and (select public.is_blog_admin()));
commit;
