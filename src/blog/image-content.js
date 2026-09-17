export function imageUrl(value) {
 const input = String(value || '').trim();
 if (!input || /[\u0000-\u0020<>]/.test(input)) throw new Error('请填写有效的图片网址。');
 if (input.startsWith('/') && !input.startsWith('//')) return input;
 const url = new URL(input);
 if (!['https:', 'http:'].includes(url.protocol)) throw new Error('图片链接需要使用 https 或 http。');
 return url.href;
}

export function imageMarkdown(src, alt = '', title = '') {
 const safe = imageUrl(src).replace(/\(/g, '%28').replace(/\)/g, '%29');
 const caption = String(alt).replace(/[\r\n]/g, ' ').replace(/([\\\[\]])/g, '\\$1');
 const escapedTitle = String(title).replace(/[\r\n]/g, ' ').replace(/\\/g, '\\\\').replace(/"/g, '\\"');
 return `![${caption}](${safe}${title ? ' "' + escapedTitle + '"' : ''})`;
}

// A reserved suffix in the standard Markdown image title persists the display size.
// Plain Markdown images and existing human-readable titles continue to work.
export function imageSize(title = '') {
 const match = String(title).match(/(?:^|\s)mkdm-width:(\d{1,4})$/);
 const width = match ? Number(match[1]) : null;
 if (!width || width < 48 || width > 4096) return { width: null, title: String(title) };
 return { width, title: String(title).slice(0, match.index).trimEnd() };
}
export function imageTitle(node) {
 if (!node.matches('[data-type="img"]')) return node.getAttribute('title') || '';
 const marker = node.querySelector('.vditor-ir__marker--title')?.textContent || '';
 return marker.replace(/^["']|["']$/g, '').replace(/\\(["\\])/g, '$1');
}
export function imageTitleWithWidth(title, width) {
 const caption = imageSize(title).title;
 return [caption, width == null ? '' : 'mkdm-width:' + Math.round(Math.max(48, Math.min(4096, width)))].filter(Boolean).join(' ');
}

// Only image-only paragraphs become rows; inline images remain inside their text.
export function decorateImageRows(root, editor = false) {
 for (const paragraph of root.querySelectorAll('p')) {
  const images = [...paragraph.querySelectorAll(editor ? ':scope > [data-type="img"]' : ':scope > img')];
  const copy = paragraph.cloneNode(true);
  copy.querySelectorAll(editor ? '[data-type="img"]' : 'img').forEach(node => node.remove());
  const imageOnly = images.length > 0 && !copy.textContent.trim() && !copy.querySelector('code, pre, a');
  paragraph.classList.toggle('blog-image-row', imageOnly);
  paragraph.classList.toggle('blog-image-pair', imageOnly && images.length > 1);
 }
 for (const node of root.querySelectorAll(editor ? '[data-type="img"]' : 'img')) {
  const size = imageSize(imageTitle(node));
  node.classList.toggle('blog-image-sized', Boolean(size.width));
  if (size.width) node.style.setProperty('--image-width', size.width + 'px');
  else node.style.removeProperty('--image-width');
  // Public HTML contains only a validated numeric width, never user-authored CSS.
  if (!editor && size.width) {
   if (size.title) node.setAttribute('title', size.title);
   else node.removeAttribute('title');
  }
 }
}
