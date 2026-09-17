import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
export const configured = Boolean(url && key && !key.startsWith('sb_secret_'));
export const supabase = configured ? createClient(url, key, {
  db: { timeout: 15000, retry: false },
  auth: { flowType: 'pkce', detectSessionInUrl: true, persistSession: true, autoRefreshToken: true },
}) : null;

export function requireClient() {
  if (!supabase) throw new Error('博客连接尚未配置。请填写 .env.local 后重新启动网站。');
  return supabase;
}

export function explainError(error) {
  if (['PGRST205', 'PGRST202', '42P01', '42883'].includes(error?.code))
    return '博客数据库尚未初始化。请在 Supabase SQL Editor 执行 001-blog.sql。';
  if (error?.code === '23505') return '这个文章链接已被使用，请修改链接后重试。';
  if (error?.code === '42501') return '没有写作权限或登录已失效，请重新检查登录和管理员配置。';
  if (error?.message?.includes('Failed to fetch') || error?.message?.includes('fetch failed'))
    return '暂时无法连接博客，请检查网络后重试。';
  return error?.message || '操作未完成，请稍后重试。';
}
