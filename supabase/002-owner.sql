-- 先访问 http://localhost:5173/admin 并用自己的 GitHub 登录。
-- 在网页或 Supabase → Authentication → Users 复制你的 User UID。
-- 已填入你提供的 User UID，可直接在 SQL Editor 执行。
-- 只能通过 SQL Editor / 数据库管理员设置；网页不能自行授予写作权限。
insert into blog_private.owner (singleton, user_id)
values (true, '884326bf-d714-491e-8ca4-b6cff4d710bc'::uuid)
on conflict (singleton) do update set user_id = excluded.user_id;

-- 返回刚设置的用户 UUID。之后回网页点击“重新检查权限”。
select user_id from blog_private.owner;
