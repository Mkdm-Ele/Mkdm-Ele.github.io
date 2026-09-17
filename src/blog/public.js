import 'katex/dist/katex.min.css';
import { pageShell } from './chrome.js';
import { listPublished, readPublished } from './posts.js';
import { escapeHtml as e, formatDate, renderMarkdown } from './content.js';
import { explainError } from './supabase.js';

export const postUrl = slug => '/blog/?post=' + encodeURIComponent(slug);
function postRow(post, index) {
  return `<article class="journal-row"><span class="journal-index">${String(index + 1).padStart(2, '0')}</span>
    <div><p class="journal-meta">${e(formatDate(post.published_at))}</p>
    <h3><a href="${postUrl(post.slug)}">${e(post.title)} <span aria-hidden="true">↗</span></a></h3>
    ${post.excerpt ? `<p class="journal-excerpt">${e(post.excerpt)}</p>` : ''}</div></article>`;
}

export function mountPostList(container, { home = false } = {}) {
  let offset = 0;
  const limit = home ? 3 : 12;
  container.innerHTML = '<div class="journal-rows"></div><p class="journal-status" role="status">Loading notes…</p><button class="soft-button journal-more" hidden>Load more</button>';
  const rows = container.querySelector('.journal-rows');
  const status = container.querySelector('.journal-status');
  const more = container.querySelector('button');
  async function load() {
    more.disabled = true;
    status.textContent = 'Loading notes…';
    try {
      const posts = await listPublished(limit, offset);
      rows.insertAdjacentHTML('beforeend', posts.map((post, i) => postRow(post, offset + i)).join(''));
      offset += posts.length;
      status.textContent = offset ? '' : 'Notes are taking shape. Check back soon.';
      more.hidden = home || posts.length < limit;
      more.textContent = 'Load more';
    } catch {
      status.textContent = 'The notebook is temporarily unavailable. Please try again.';
      more.hidden = false;
      more.textContent = 'Try again';
    } finally { more.disabled = false; }
  }
  more.addEventListener('click', load);
  return load();
}

export function mountHomeBlog() {
  const section = document.querySelector('#blog');
  if (section) mountPostList(section.querySelector('[data-post-list]'), { home: true });
}

export async function renderBlog() {
  const app = document.querySelector('#app');
  const slug = new URLSearchParams(location.search).get('post');
  if (!slug) {
    document.title = 'Notebook · Mkdm-Ele';
    app.innerHTML = pageShell(`<section class="journal-page"><div class="journal-heading"><div><p class="eyebrow">NOTES FROM THE WORKBENCH</p><h1>Things I’m<br>figuring out<span class="accent-dot">.</span></h1></div><p>On perception, learning,<br>and getting robots moving.</p></div><div data-post-list></div></section>`);
    await mountPostList(app.querySelector('[data-post-list]'));
    return;
  }
  app.innerHTML = pageShell('<div class="article-loading" role="status">Opening the notebook…</div>');
  try {
    const post = await readPublished(slug);
    if (!post) {
      document.title = 'Note not found · Mkdm-Ele';
      app.innerHTML = pageShell('<section class="journal-page"><p class="eyebrow">NOT FOUND</p><h1>This page is still blank.</h1><p>The note may be a draft, or its link may have changed.</p><a class="text-link" href="/blog/">Back to the notebook ↗</a></section>');
      return;
    }
    document.title = post.title + ' · Mkdm-Ele';
    document.querySelector('meta[name="description"]').content = post.excerpt || post.title;
    app.innerHTML = pageShell(`<article class="article-page"><a class="text-link" href="/blog/">← All notes</a>
      <header class="article-heading"><p class="journal-meta">${e(formatDate(post.published_at))} <span>/</span> MKDM-ELE</p>
      <h1>${e(post.title)}</h1>${post.excerpt ? `<p class="article-deck">${e(post.excerpt)}</p>` : ''}</header>
      <div class="markdown-body">${renderMarkdown(post.content)}</div>
      <footer class="article-end"><span>Thanks for reading.</span><a href="/blog/" class="text-link">Back to the notebook ↗</a></footer></article>`);
  } catch (error) {
    app.innerHTML = pageShell(`<section class="journal-page"><h1>The notebook is out of reach.</h1><p role="alert">${e(explainError(error))}</p><a class="soft-button" href="${postUrl(slug)}">Try again</a></section>`);
  }
}
