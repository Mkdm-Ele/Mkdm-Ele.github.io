-- 在 Supabase → SQL Editor → New query 中执行整个文件。
-- 可重复运行；不会删除文章。执行后，再完成 002-owner.sql。
begin;

create schema if not exists blog_private;
revoke all on schema blog_private from public, anon, authenticated;
create table if not exists blog_private.owner (
  singleton boolean primary key default true check (singleton),
  user_id uuid not null unique references auth.users(id) on delete cascade
);
alter table blog_private.owner enable row level security;
revoke all on blog_private.owner from public, anon, authenticated;

-- 只检查后台配置的用户 UUID，不信任可由用户修改的昵称或 metadata。
create or replace function public.is_blog_admin()
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from blog_private.owner where user_id = (select auth.uid())
  );
$$;
revoke all on function public.is_blog_admin() from public;
grant execute on function public.is_blog_admin() to anon, authenticated;

create table if not exists public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (
    char_length(slug) between 1 and 100 and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
  ),
  title text not null check (char_length(btrim(title)) between 1 and 160),
  excerpt text not null default '' check (char_length(excerpt) <= 400),
  content text not null default '' check (char_length(content) <= 200000),
  status text not null default 'draft' check (status in ('draft', 'published')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  check (status <> 'published' or published_at is not null)
);
create index if not exists blog_posts_published_at_idx
  on public.blog_posts (published_at desc) where status = 'published';

create or replace function blog_private.stamp_post()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if TG_OP = 'INSERT' then
    NEW.created_at := now();
    NEW.published_at := case when NEW.status = 'published' then now() else null end;
  else
    NEW.id := OLD.id;
    NEW.created_at := OLD.created_at;
    NEW.published_at := OLD.published_at;
    if NEW.status = 'published' and OLD.published_at is null then
      NEW.published_at := now();
    end if;
  end if;
  NEW.updated_at := now();
  return NEW;
end;
$$;
revoke all on function blog_private.stamp_post() from public, anon, authenticated;
drop trigger if exists stamp_blog_post on public.blog_posts;
create trigger stamp_blog_post before insert or update on public.blog_posts
  for each row execute function blog_private.stamp_post();

alter table public.blog_posts enable row level security;
revoke all on public.blog_posts from public, anon, authenticated;
grant select on public.blog_posts to anon;
grant select, insert, update, delete on public.blog_posts to authenticated;

drop policy if exists "Read published posts or own drafts" on public.blog_posts;
create policy "Read published posts or own drafts" on public.blog_posts
  for select to anon, authenticated
  using (status = 'published' or (select public.is_blog_admin()));
drop policy if exists "Owner inserts posts" on public.blog_posts;
create policy "Owner inserts posts" on public.blog_posts
  for insert to authenticated with check ((select public.is_blog_admin()));
drop policy if exists "Owner updates posts" on public.blog_posts;
create policy "Owner updates posts" on public.blog_posts
  for update to authenticated
  using ((select public.is_blog_admin())) with check ((select public.is_blog_admin()));
drop policy if exists "Owner deletes posts" on public.blog_posts;
create policy "Owner deletes posts" on public.blog_posts
  for delete to authenticated using ((select public.is_blog_admin()));

notify pgrst, 'reload schema';
commit;
