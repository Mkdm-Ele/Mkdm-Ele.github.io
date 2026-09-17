import { pageShell } from './chrome.js';
import { requireClient, explainError } from './supabase.js';
import { listAllPosts, readPost, savePost, deletePost } from './posts.js';
import { escapeHtml as e, formatDate, slugFromTitle, validatePost } from './content.js';

let writerEditor = null;
let dirty = false;
let cleanSnapshot = '';
let lastSnapshot = '';
let busy = false;
let current = null;
let listOffset = 0;
let authGeneration = 0;
let renderedUser = null;
const app = document.querySelector('#app');
const $ = selector => app.querySelector(selector);


function gate(content) {
  writerEditor?.destroy();
  writerEditor = null;
  document.body.classList.remove('writer-focus');
  app.innerHTML = pageShell(`<section class="writer-gate"><p class="eyebrow">A QUIET PLACE TO THINK</p><h1>Writer’s desk<span class="accent-dot">.</span></h1>${content}<p class="writer-back"><a href="/blog/">← Back to the notebook</a></p></section>`);
}
function status(message, error = false) {
  const node = $('#editor-status');
  if (node) { node.textContent = message; node.classList.toggle('is-error', error); }
}
function setBusy(value) {
  busy = value;
  app.querySelectorAll('[data-mutation], [data-open-post], #new-post, #sign-out').forEach(node => node.disabled = value);
  if ($('#post-fields')) $('#post-fields').disabled = value;
  writerEditor?.setDisabled(value);
}
function canLeave() {
  return !dirty || window.confirm('当前修改还没有保存。确定离开吗？');
}
async function signOut() {
  if (!canLeave()) return;
  const { error } = await requireClient().auth.signOut({ scope: 'local' });
  if (error) {
    const node = $('#gate-error') || $('#editor-status');
    if (node) node.textContent = explainError(error);
    return;
  }
  dirty = false;
  renderedUser = null;
  await showAuth();
}
function bindSignOut() { $('#sign-out')?.addEventListener('click', signOut); }

async function showAuth() {
  const generation = ++authGeneration;
  gate('<p role="status">正在检查登录与写作权限…</p>');
  try {
    const client = requireClient();
    const { data: { user }, error } = await client.auth.getUser();
    if (generation !== authGeneration) return;
    if (error && error.name !== 'AuthSessionMissingError') throw error;
    renderedUser = user?.id ?? null;
    if (!user) {
      const url = new URL(location.href);
      const hash = new URLSearchParams(url.hash.slice(1));
      const oauthError = url.searchParams.get('error_description') || hash.get('error_description');
      if (url.searchParams.has('error') || hash.has('error')) history.replaceState(null, '', '/admin/');
      gate(`<p>用 GitHub 登录，继续记录你的想法。</p><p class="writer-fine">仅网站管理员可以写作和发布。</p><button class="soft-button primary-button" id="github-login">Continue with GitHub ↗</button><p id="gate-error" role="alert">${e(oauthError || '')}</p>`);
      $('#github-login').addEventListener('click', async () => {
        $('#github-login').disabled = true;
        try {
          const { error: loginError } = await client.auth.signInWithOAuth({
            provider: 'github', options: { redirectTo: location.origin + '/admin' },
          });
          if (loginError) throw loginError;
        } catch (loginError) {
          $('#gate-error').textContent = explainError(loginError);
          $('#github-login').disabled = false;
        }
      });
      return;
    }
    const { data: isAdmin, error: permissionError } = await client.rpc('is_blog_admin');
    if (generation !== authGeneration) return;
    if (permissionError) throw permissionError;
    if (!isAdmin) {
      gate(`<p>你已登录，但当前账号还没有写作权限。</p><p class="writer-fine">如果你是网站所有者，请在 Supabase 配置管理员后重新检查。</p><label class="uid-label" for="user-uid">当前账号的 User UID</label><input id="user-uid" readonly value="${e(user.id)}"><div class="gate-actions"><button class="soft-button" id="check-permission">重新检查权限</button><button class="text-button" id="sign-out">退出登录</button></div><p id="gate-error" role="alert"></p>`);
      $('#check-permission').addEventListener('click', showAuth);
      bindSignOut();
      return;
    }
    await renderDesk();
    await refreshList();
  } catch (error) {
    if (generation !== authGeneration) return;
    gate(`<p role="alert">${e(explainError(error))}</p><div class="gate-actions"><button class="soft-button" id="retry-auth">重试</button><button class="text-button" id="sign-out">退出登录</button></div><p id="gate-error" role="alert"></p>`);
    $('#retry-auth').addEventListener('click', showAuth);
    bindSignOut();
  }
}

async function renderDesk() {
  app.innerHTML = pageShell(`<section class="writer-page"><div class="writer-heading"><div><p class="eyebrow">THE NOTEBOOK / PRIVATE DESK</p><h1>A thought, written down<span class="accent-dot">.</span></h1></div><button class="text-button" id="sign-out">退出登录 ↗</button></div>
  <div class="writer-tools"><div class="writer-tools-left"><button class="soft-button" id="toggle-shelf" type="button" aria-expanded="false" aria-controls="post-shelf">文章目录</button><span class="desk-mode"><span></span> 即时渲染</span></div><div class="writer-tools-right"><button class="soft-button quick-save" id="quick-save" type="button" data-mutation>保存 · Ctrl S</button><button class="soft-button" id="focus-writing" type="button" aria-pressed="false">专注写作 ↗</button></div></div>
  <div class="desk-layout shelf-collapsed"><aside class="post-shelf" id="post-shelf" aria-label="你的文章"><div class="shelf-heading"><h2>你的文章</h2><button class="soft-button" id="new-post">＋ 新文章</button></div><div id="owner-posts"></div><p id="list-status" role="status"></p><button class="text-button" id="more-posts" hidden>加载更多</button></aside>
  <form class="editor-panel" id="post-form"><fieldset id="post-fields"><legend class="sr-only">文章编辑</legend><label class="editor-title-label" for="post-title">THE NOTEBOOK / 记录正在发生的想法</label><input id="post-title" name="title" maxlength="160" required placeholder="写下你的标题…" autocomplete="off">
  <details class="editor-meta-wrap"><summary>文章设置 <span>链接与摘要</span></summary><div class="editor-meta"><div><label for="post-slug">文章链接 <span>小写英文 / 数字 / 连字符</span></label><input id="post-slug" name="slug" required maxlength="100" pattern="[a-z0-9]+(-[a-z0-9]+)*" autocomplete="off" spellcheck="false"></div><div><label for="post-excerpt">摘要 <span>可选 · 最多 400 字</span></label><textarea id="post-excerpt" name="excerpt" maxlength="400" rows="2" placeholder="用一两句话，介绍这篇文章。"></textarea></div></div></details>
  <div class="writing-label"><span>正文 <span class="writing-label-hint">直接输入 Markdown，格式即时呈现</span></span><span id="word-count">0 字符</span></div>
  <div id="live-editor"><p class="editor-loading" role="status">正在打开写作页面…</p></div>
  <details class="markdown-help"><summary>Markdown 语法与快捷键</summary><p><code>## 空格</code> 输入标题 · <code>**文字**</code> 加粗 · <code>- 空格</code> 创建列表 · <code>[文字](网址)</code> 插入链接 · <code>![说明](图片网址)</code> 插入图片</p><p>在同一页面直接编辑，图片可通过工具栏插入、粘贴截图或拖入文件；拖到另一张图左右侧即可并排。Ctrl / ⌘ + S 保存，Ctrl / ⌘ + Z 撤销。</p></details></fieldset>
  <div class="editor-actions"><span id="post-state" class="state-mark">未保存</span><div><button type="submit" class="soft-button" id="save-post" data-mutation>保存草稿</button><button type="button" class="soft-button primary-button" id="publish-post" data-mutation>发布文章 ↗</button><button type="button" class="text-button" id="unpublish-post" data-mutation hidden>转为草稿</button></div></div>
  <p id="editor-status" role="status" aria-live="polite"></p><div class="editor-secondary"><a id="view-post" class="text-link" target="_blank" rel="noopener noreferrer" hidden>查看文章 ↗</a><button type="button" id="delete-post" class="text-button danger-button" data-mutation hidden>删除文章</button></div></form></div></section>`);
  $('.site-shell').classList.add('writer-shell');
  bindSignOut();
  $('#toggle-shelf').addEventListener('click', () => {
    const collapsed = $('.desk-layout').classList.toggle('shelf-collapsed');
    $('#toggle-shelf').setAttribute('aria-expanded', String(!collapsed));
  });
  $('#focus-writing').addEventListener('click', () => toggleFocus());
  $('#quick-save').addEventListener('click', () => persist(current?.status || 'draft'));
  $('#new-post').addEventListener('click', () => { if (!busy && canLeave()) fillEditor(null); });
  $('#more-posts').addEventListener('click', () => refreshList(true));
  $('#post-form').addEventListener('submit', event => { event.preventDefault(); persist(current?.status || 'draft'); });
  $('#publish-post').addEventListener('click', () => persist('published'));
  $('#unpublish-post').addEventListener('click', () => {
    if (window.confirm('转为草稿后，访客将无法阅读这篇文章。继续吗？')) persist('draft');
  });
  $('#delete-post').addEventListener('click', removeCurrent);
  $('#post-form').addEventListener('input', event => {
    if (event.target.id === 'post-title' && !current && !$('#post-slug').dataset.manual) {
      $('#post-slug').value = slugFromTitle(event.target.value) || $('#post-slug').dataset.fallback;
    }
    if (event.target.id === 'post-slug') $('#post-slug').dataset.manual = 'true';
    markChanged();
  });
  setBusy(true);
  const host = $('#live-editor');
  const { createMarkdownEditor } = await import('./editor.js');
  const instance = await createMarkdownEditor(host, { onChange(value) {
    markChanged(value);
  }, onBusyChange(value) { setBusy(value); } });
  if (!host.isConnected) { instance.destroy(); return; }
  writerEditor = instance;
  fillEditor(null);
  setBusy(false);
}
function snapshot() {
  return JSON.stringify(['title', 'slug', 'excerpt'].map(field => $('#post-' + field).value).concat(writerEditor.getValue()));
}
function markChanged(value) {
  if (!writerEditor) return;
  const next = snapshot();
  if (next === lastSnapshot) return;
  lastSnapshot = next;
  dirty = next !== cleanSnapshot;
  updateCount(value ?? writerEditor.getValue());
  status(dirty ? '尚有修改未保存' : '所有修改已保存。');
}
function updateCount(value = '') {
  if ($('#word-count')) $('#word-count').textContent = value.length.toLocaleString('zh-CN') + ' 字符';
}
function toggleFocus(force) {
  const active = document.body.classList.toggle('writer-focus', force ?? !document.body.classList.contains('writer-focus'));
  $('#focus-writing').textContent = active ? '退出专注 · Esc' : '专注写作 ↗';
  $('#focus-writing').setAttribute('aria-pressed', String(active));
}
function fillEditor(post, { preserveEditor = false } = {}) {
  current = post;
  dirty = false;
  for (const field of ['title', 'slug', 'excerpt']) $('#post-' + field).value = post?.[field] || '';
  const fallback = 'note-' + crypto.randomUUID().slice(0, 8);
  $('#post-slug').dataset.fallback = fallback;
  delete $('#post-slug').dataset.manual;
  if (!post) $('#post-slug').value = fallback;
  const published = post?.status === 'published';
  $('#post-state').textContent = published ? '已发布' : post ? '草稿' : '未保存';
  $('#save-post').textContent = published ? '保存修改' : '保存草稿';
  $('#publish-post').hidden = published;
  $('#unpublish-post').hidden = !published;
  $('#delete-post').hidden = !post;
  $('#view-post').hidden = !published;
  $('#view-post').href = post ? '/blog/?post=' + encodeURIComponent(post.slug) : '/blog/';
  status(post ? '已载入 · ' + formatDate(post.updated_at) : '从一个想法开始。草稿仅你可见。');
  app.querySelectorAll('[data-open-post]').forEach(button => button.classList.toggle('selected', button.dataset.openPost === post?.id));
  if (!preserveEditor) writerEditor.setValue(post?.content || '');
  updateCount(writerEditor.getValue());
  cleanSnapshot = lastSnapshot = snapshot();
}
async function refreshList(append = false) {
  const list = $('#owner-posts');
  if (!list) return;
  if (!append) { listOffset = 0; list.innerHTML = ''; }
  $('#list-status').textContent = '正在读取…';
  $('#more-posts').disabled = true;
  try {
    const posts = await listAllPosts(30, listOffset);
    list.insertAdjacentHTML('beforeend', posts.map(post => `<button type="button" class="shelf-post ${post.id === current?.id ? 'selected' : ''}" data-open-post="${e(post.id)}"><span>${e(post.title)}</span><small>${post.status === 'published' ? '已发布' : '草稿'} · ${e(formatDate(post.updated_at))}</small></button>`).join(''));
    listOffset += posts.length;
    $('#list-status').textContent = listOffset ? '' : '还没有文章。写下第一篇吧。';
    $('#more-posts').hidden = posts.length < 30;
    $('#more-posts').textContent = '加载更多';
    list.querySelectorAll('[data-open-post]:not([data-bound])').forEach(button => {
      button.dataset.bound = 'true';
      button.addEventListener('click', async () => {
        if (busy || !canLeave()) return;
        setBusy(true);
        try { fillEditor(await readPost(button.dataset.openPost)); }
        catch (error) { status(explainError(error), true); }
        finally { setBusy(false); }
      });
    });
  } catch (error) {
    $('#list-status').textContent = explainError(error);
    $('#more-posts').hidden = false;
    $('#more-posts').textContent = '重试';
  } finally { $('#more-posts').disabled = false; }
}
async function persist(postStatus) {
  if (busy || !writerEditor) return;
  if (!$('#post-form').checkValidity()) $('.editor-meta-wrap').open = true;
  if (!$('#post-form').reportValidity()) return;
  const post = Object.fromEntries(new FormData($('#post-form')));
  post.content = writerEditor.getValue();
  post.status = postStatus;
  const problem = validatePost(post);
  if (problem) { status(problem, true); return; }
  setBusy(true);
  status('正在保存…');
  try {
    const saved = await savePost(post, current);
    fillEditor(saved, { preserveEditor: true });
    await refreshList();
    status(postStatus === 'published' ? '已发布。读者现在可以阅读这篇文章。' : '草稿已保存，仅你可见。');
  } catch (error) { status(explainError(error), true); }
  finally { setBusy(false); }
}
async function removeCurrent() {
  if (busy || !current || !window.confirm('永久删除「' + current.title + '」？此操作无法撤销。')) return;
  setBusy(true);
  try {
    await deletePost(current);
    fillEditor(null);
    await refreshList();
    status('文章已删除。');
  } catch (error) { status(explainError(error), true); }
  finally { setBusy(false); }
}

export async function renderAdmin() {
  document.title = 'Writer’s desk · Mkdm-Ele';
  // Auth callbacks must stay synchronous; schedule further Supabase calls outside the callback.
  if (requireClient()) {
    requireClient().auth.onAuthStateChange(event => {
      if (event === 'SIGNED_OUT' && renderedUser) {
        setTimeout(() => {
          renderedUser = null;
          if (dirty && $('#post-form')) {
            status('登录已失效。请先复制未保存的正文，再刷新页面重新登录。', true);
            app.querySelectorAll('[data-mutation]').forEach(button => button.disabled = true);
          } else showAuth();
        }, 0);
      }
    });
  }
  window.addEventListener('keydown', event => {
    if (!$('#post-form') || event.isComposing) return;
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
      event.preventDefault();
      persist(current?.status || 'draft');
    }
    if (event.key === 'Escape' && document.body.classList.contains('writer-focus')) toggleFocus(false);
  });
  window.addEventListener('beforeunload', event => {
    if (dirty || busy) { event.preventDefault(); event.returnValue = ''; }
  });
  app.addEventListener('click', event => {
    const anchor = event.target.closest('a');
    if (anchor && !anchor.hash && anchor.target !== '_blank' && !canLeave()) event.preventDefault();
  });
  await showAuth();
}
