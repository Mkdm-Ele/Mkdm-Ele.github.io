import { requireClient } from './supabase.js';

const summaryFields = 'id,slug,title,excerpt,status,created_at,updated_at,published_at';
function unwrap({ data, error }) {
  if (error) throw error;
  return data;
}
export async function listPublished(limit = 12, offset = 0) {
  return unwrap(await requireClient().from('blog_posts').select(summaryFields)
    .eq('status', 'published').order('published_at', { ascending: false })
    .order('id', { ascending: false }).range(offset, offset + limit - 1));
}
export async function readPublished(slug) {
  return unwrap(await requireClient().from('blog_posts').select('*')
    .eq('slug', slug).eq('status', 'published').maybeSingle());
}
export async function listAllPosts(limit = 30, offset = 0) {
  return unwrap(await requireClient().from('blog_posts').select(summaryFields)
    .order('updated_at', { ascending: false }).order('id', { ascending: false })
    .range(offset, offset + limit - 1));
}
export async function readPost(id) {
  return unwrap(await requireClient().from('blog_posts').select('*').eq('id', id).single());
}
export async function savePost(post, previous) {
  const fields = { title: post.title.trim(), slug: post.slug, excerpt: post.excerpt.trim(),
    content: post.content, status: post.status };
  const query = previous?.id
    ? requireClient().from('blog_posts').update(fields).eq('id', previous.id)
      .eq('updated_at', previous.updated_at)
    : requireClient().from('blog_posts').insert(fields);
  const saved = unwrap(await query.select().maybeSingle());
  if (!saved) throw new Error('文章已在其他窗口更新，或权限已改变。请复制当前正文，再重新打开文章。');
  return saved;
}
export async function deletePost(post) {
  const removed = unwrap(await requireClient().from('blog_posts').delete().eq('id', post.id)
    .eq('updated_at', post.updated_at).select('id'));
  if (!removed?.length) throw new Error('删除未完成：文章可能已被更新，请刷新后重试。');
}
