import { createMathMarkdown } from './math-content.js';
import DOMPurify from 'dompurify';
import { decorateImageRows } from './image-content.js';

export const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g,
  character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));

export function renderMarkdown(source = '') {
  const { html, renderMath } = createMathMarkdown(source);
  const fragment = DOMPurify.sanitize(html, {
    RETURN_DOM_FRAGMENT: true,
    USE_PROFILES: { html: true },
    FORBID_TAGS: ['style', 'form', 'input', 'button', 'textarea', 'select', 'iframe', 'video', 'audio'],
    FORBID_ATTR: ['style', 'id', 'name', 'srcset', 'autofocus'],
    ALLOW_DATA_ATTR: false,
  });
  renderMath(fragment);
  decorateImageRows(fragment);
  const wrapper = fragment.ownerDocument.createElement('div');
  wrapper.append(fragment);
  return wrapper.innerHTML;
}

export function formatDate(date) {
  return date ? new Intl.DateTimeFormat('en', {
    year: 'numeric', month: 'short', day: 'numeric',
  }).format(new Date(date)) : 'Draft';
}

export function slugFromTitle(title) {
  return title.normalize('NFKD').toLowerCase().replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 100).replace(/-$/, '');
}

export function validatePost(post) {
  if (!post.title.trim() || post.title.trim().length > 160) return '请填写标题（最多 160 字）。';
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(post.slug) || post.slug.length > 100)
    return '文章链接使用小写英文字母、数字和连字符，最多 100 字符。';
  if (post.excerpt.length > 400) return '摘要最多 400 字。';
  if (post.content.length > 200000) return '正文过长，请控制在 200,000 字符以内。';
  if (!post.content.trim() && post.status === 'published') return '发布前请先填写正文。';
  return null;
}
