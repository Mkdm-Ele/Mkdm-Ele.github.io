import { test, expect } from '@playwright/test';

const origin = 'https://uodpghphgcgryxkmocst.supabase.co';
const ownerId = '11111111-1111-4111-8111-111111111111';
const timestamp = '2026-09-16T01:00:00.000Z';
const post = {
  id: '33333333-3333-4333-8333-333333333333', title: 'Learning through motion',
  slug: 'learning-through-motion', excerpt: 'Some observations from the workbench.',
  content: '# An observation\n\n**Learning** takes time.\n\n<script>window.injected=true</script>',
  status: 'published', created_at: timestamp, updated_at: timestamp, published_at: timestamp,
};

async function mockApi(page, { admin = false, loggedIn = false, empty = false, initialPosts } = {}) {
  let posts = initialPosts || (empty ? [] : [{ ...post }]);
  let clock = 0;
  if (loggedIn) {
    const user = { id: ownerId, aud: 'authenticated', role: 'authenticated', email: 'owner@example.test',
      app_metadata: { provider: 'github', providers: ['github'] }, user_metadata: {} };
    await page.addInitScript(({ user }) => {
      const encode = value => btoa(JSON.stringify(value)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
      const expiry = Math.floor(Date.now() / 1000) + 3600;
      const token = encode({ alg: 'HS256' }) + '.' + encode({ sub: user.id, exp: expiry, role: 'authenticated' }) + '.fixture';
      localStorage.setItem('sb-uodpghphgcgryxkmocst-auth-token',
        JSON.stringify({ access_token: token, refresh_token: 'fixture', token_type: 'bearer',
          expires_in: 3600, expires_at: expiry, user }));
    }, { user });
  }
  await page.route(origin + '/**', async route => {
    const request = route.request();
    const url = new URL(request.url());
    const json = data => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(data) });
    if (url.pathname.endsWith('/auth/v1/user')) {
      return loggedIn ? json({ id: ownerId, app_metadata: { provider: 'github' }, user_metadata: {} })
        : route.fulfill({ status: 401, contentType: 'application/json', body: '{"message":"No session"}' });
    }
    if (url.pathname.endsWith('/auth/v1/logout')) return route.fulfill({ status: 204 });
    if (url.pathname.endsWith('/rpc/is_blog_admin')) return json(admin);
    if (url.pathname.endsWith('/blog_posts')) {
      if (request.method() === 'POST') {
        const next = request.postDataJSON();
        posts.push({ ...next, id: crypto.randomUUID(), created_at: timestamp, updated_at: timestamp,
          published_at: next.status === 'published' ? timestamp : null });
        return json(posts.at(-1));
      }
      if (request.method() === 'PATCH') {
        const index = posts.findIndex(p => 'eq.' + p.id === url.searchParams.get('id'));
        const next = request.postDataJSON();
        posts[index] = { ...posts[index], ...next, updated_at: new Date(Date.parse(timestamp) + ++clock * 1000).toISOString(),
          published_at: next.status === 'published' ? timestamp : posts[index].published_at };
        return json(posts[index]);
      }
      if (request.method() === 'DELETE') {
        const removed = posts.filter(p => 'eq.' + p.id === url.searchParams.get('id'));
        posts = posts.filter(p => 'eq.' + p.id !== url.searchParams.get('id'));
        return json(removed.map(p => ({ id: p.id })));
      }
      let selected = posts.filter(p =>
        (!url.searchParams.has('slug') || 'eq.' + p.slug === url.searchParams.get('slug')) &&
        (!url.searchParams.has('id') || 'eq.' + p.id === url.searchParams.get('id')) &&
        (!url.searchParams.has('status') || 'eq.' + p.status === url.searchParams.get('status')));
      if (url.searchParams.has('slug') || url.searchParams.has('id')) return json(selected[0] || null);
      return json(selected);
    }
    return json({});
  });
}
async function writeMarkdown(page, value) {
  const body = page.getByRole('textbox', { name: '文章正文', exact: true });
  await expect(body).toBeVisible({ timeout: 15000 });
  await body.click();
  await body.press('ControlOrMeta+A');
  await body.press('Backspace');
  await body.evaluate((element, text) => {
    const clipboardData = new DataTransfer();
    clipboardData.setData('text/plain', text);
    element.dispatchEvent(new ClipboardEvent('paste', { clipboardData, bubbles: true, cancelable: true }));
  }, value);
}
async function openShelf(page) {
  if (await page.locator('#toggle-shelf').getAttribute('aria-expanded') === 'false')
    await page.locator('#toggle-shelf').click();
}
async function noOverflow(page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
}

test('read a published article by a direct link, safely and on mobile', async ({ page }) => {
  await mockApi(page);
  await page.goto('/blog/');
  await expect(page.getByRole('heading', { name: 'Things I’m figuring out.' })).toBeVisible();
  await page.getByRole('link', { name: /Learning through motion/ }).click();
  await expect(page.getByRole('heading', { name: 'An observation' })).toBeVisible();
  expect(await page.evaluate(() => window.injected)).toBeUndefined();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'An observation' })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await noOverflow(page);
  await page.screenshot({ path: '.sites-runtime/blog-mobile.png', fullPage: true });
});

test('anonymous visitors see login and non-owners never see the editor', async ({ page }) => {
  await mockApi(page);
  await page.goto('/admin/');
  await expect(page.getByRole('button', { name: 'Continue with GitHub' })).toBeVisible();
  await expect(page.locator('#post-form')).toHaveCount(0);
  await page.unrouteAll();
  await mockApi(page, { loggedIn: true });
  await page.reload();
  await expect(page.locator('#user-uid')).toHaveValue(ownerId);
  await expect(page.locator('#post-form')).toHaveCount(0);
});

test('owner can create, preview, save, reopen, publish, unpublish and delete a note', async ({ page }) => {
  await mockApi(page, { admin: true, loggedIn: true, empty: true });
  await page.goto('/admin/');
  await page.locator('#post-title').fill('A new observation');
  await expect(page.locator('#post-slug')).toHaveValue('a-new-observation');
  await page.locator('.editor-meta-wrap > summary').click();
  await page.locator('#post-excerpt').fill('A short introduction.');
  await writeMarkdown(page, '## A working idea\n\n**Hello**, world.');
  await expect(page.locator('#live-editor strong')).toContainText('Hello');
  await page.getByRole('button', { name: '保存草稿', exact: true }).click();
  await expect(page.locator('#editor-status')).toHaveText('草稿已保存，仅你可见。');
  await openShelf(page);
  await page.getByRole('button', { name: '新文章' }).click();
  await page.locator('[data-open-post]').click();
  await expect(page.locator('#live-editor h2')).toContainText('A working idea');
  await expect(page.locator('#live-editor strong')).toContainText('Hello');
  await page.getByRole('button', { name: '发布文章' }).click();
  await expect(page.locator('#post-state')).toHaveText('已发布');
  await expect(page.locator('#view-post')).toHaveAttribute('href', '/blog/?post=a-new-observation');
  await writeMarkdown(page, '## A working idea\n\nUpdated text.');
  await page.getByRole('button', { name: '保存修改' }).click();
  await expect(page.locator('#editor-status')).toHaveText('已发布。读者现在可以阅读这篇文章。');
  await page.locator('#toggle-shelf').click();
  await page.locator('.editor-meta-wrap > summary').click();
  await page.evaluate(() => scrollTo(0, 0));
  await page.screenshot({ path: '.sites-runtime/writer-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await noOverflow(page);
  await page.screenshot({ path: '.sites-runtime/writer-mobile.png', fullPage: true });
  page.on('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: '转为草稿' }).click();
  await expect(page.locator('#post-state')).toHaveText('草稿');
  await page.getByRole('button', { name: '删除文章' }).click();
  await expect(page.locator('#editor-status')).toHaveText('文章已删除。');
  await expect(page.locator('[data-open-post]')).toHaveCount(0);
});

test('notebook has empty, missing and retry states', async ({ page }) => {
  await mockApi(page, { empty: true });
  await page.goto('/blog/');
  await expect(page.getByText('Notes are taking shape. Check back soon.')).toBeVisible();
  await page.goto('/blog/?post=missing');
  await expect(page.getByRole('heading', { name: 'This page is still blank.' })).toBeVisible();
  await page.unrouteAll();
  await page.route(origin + '/**', route => route.abort());
  await page.goto('/blog/');
  await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();
  await page.unrouteAll();
  await mockApi(page);
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.getByRole('link', { name: /Learning through motion/ })).toBeVisible();
});

test('homepage keeps the Go2 viewer and research gallery alongside the new blog', async ({ page }) => {
  await mockApi(page);
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.goto('/');
  await expect(page.locator('#intro-title')).toContainText('Learning to navigate');
  await expect(page.locator('.stage-word')).toHaveCount(0);
  await expect(page.locator('#model-status')).toHaveText('READY TO EXPLORE', { timeout: 25000 });
  await page.getByRole('button', { name: 'Crouch', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Crouch', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.locator('[data-figure="1"]').click();
  await expect(page.locator('#figure-title')).toHaveText('From perception to action.');
  await page.locator('#figure-open').click();
  await expect(page.locator('#figure-dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#figure-dialog')).not.toBeVisible();
  await expect(page.locator('#blog .journal-row')).toHaveCount(1);
  await page.locator('#blog').screenshot({ path: '.sites-runtime/home-blog.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  await noOverflow(page);
  expect(pageErrors).toEqual([]);
});

test('failed saves keep writing intact and canceling navigation retains unsaved work', async ({ page }) => {
  await mockApi(page, { admin: true, loggedIn: true, empty: true });
  await page.goto('/admin/');
  await page.locator('#post-title').fill('Keep this thought');
  await writeMarkdown(page, 'My unsaved text');
  page.on('dialog', dialog => dialog.dismiss());
  await openShelf(page);
  await page.getByRole('button', { name: '新文章' }).click();
  await expect(page.getByRole('textbox', { name: '文章正文', exact: true })).toContainText('My unsaved text');
  await page.route(origin + '/rest/v1/blog_posts**', route => {
    if (route.request().method() === 'POST') return route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ code: '42501', message: 'permission denied' }) });
    return route.fallback();
  });
  await page.getByRole('button', { name: '保存草稿', exact: true }).click();
  await expect(page.locator('#editor-status')).toContainText('没有写作权限');
  await expect(page.getByRole('textbox', { name: '文章正文', exact: true })).toContainText('My unsaved text');
});


test('single-surface editor supports typing, Chinese, undo, focus mode and Ctrl+S', async ({ page }) => {
  const errors = [];
  const externalAssets = [];
  const saves = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => {
    const url = new URL(request.url());
    if (['script', 'stylesheet', 'font'].includes(request.resourceType()) && url.origin !== 'http://localhost:5173')
      externalAssets.push(request.url());
    if (request.method() === 'POST' && url.pathname.endsWith('/blog_posts')) saves.push(request.postDataJSON());
  });
  await mockApi(page, { admin: true, loggedIn: true, empty: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/admin/');
  await page.locator('#post-title').fill('一个想法');
  const editor = page.getByRole('textbox', { name: '文章正文', exact: true });
  await expect(editor).toBeVisible();
  expect((await editor.boundingBox()).width).toBeGreaterThan(1100);
  expect((await editor.boundingBox()).height).toBeGreaterThanOrEqual(680);
  await expect(page.locator('.preview-column')).toHaveCount(0);
  await editor.click();
  await page.keyboard.type('## A new idea');
  await page.keyboard.press('Enter');
  await page.keyboard.insertText('让机器人学会导航。');
  await page.keyboard.press('Enter');
  await page.keyboard.type('**Learn by moving.**');
  await page.keyboard.press('Enter');
  await expect(editor.locator('h2')).toContainText('A new idea');
  await expect(editor.locator('strong')).toContainText('Learn by moving.');
  await expect(editor).toContainText('让机器人学会导航。');
  await page.locator('#post-title').click();
  await expect.poll(() => editor.locator('.vditor-ir__marker--bi').first().evaluate(el => el.getBoundingClientRect().width)).toBe(0);
  await page.locator('#focus-writing').click();
  await expect(page.locator('body')).toHaveClass(/writer-focus/);
  await expect(page.locator('.site-header')).toBeHidden();
  await expect(page.locator('#post-title')).toHaveValue('一个想法');
  await page.screenshot({ path: '.sites-runtime/writer-focus.png', fullPage: true });
  await page.keyboard.press('Escape');
  await expect(page.locator('.site-header')).toBeVisible();
  await page.keyboard.press('ControlOrMeta+s');
  await expect(page.locator('#editor-status')).toContainText('草稿已保存');
  expect(saves).toHaveLength(1);
  expect(saves[0].content).toContain('## A new idea');
  expect(saves[0].content).toContain('**Learn by moving.**');
  expect(saves[0].content).toContain('让机器人学会导航。');

  // Allow the editor's undo boundary, then type and undo one user action.
  await editor.click();
  await editor.press('ControlOrMeta+End');
  await page.keyboard.type('Temporary sentence.');
  await expect(editor).toContainText('Temporary sentence.');
  await expect(page.locator('#live-editor [data-type="undo"]')).not.toHaveClass(/vditor-menu--disabled/);
  await page.keyboard.press('ControlOrMeta+z');
  await expect(editor).not.toContainText('Temporary sentence.');
  expect(errors).toEqual([]);
  expect(externalAssets).toEqual([]);
});

test('existing GFM survives editing and unsafe HTML cannot execute in the writing surface', async ({ page }) => {
  const content = [
    '# Notebook',
    '中文与 **bold**、[a link](https://example.com).',
    '- One\n- Two',
    '> A quoted thought.',
    '| Name | Value |\n| --- | --- |\n| Go2 | 12 |',
    '```js\nconst joints = 12;\n```',
    '<img src="/missing-fixture-image" onerror="window.editorInjected=true">',
    '<script>window.editorInjected=true</script>',
  ].join('\n\n');
  let saved;
  page.on('request', request => {
    if (request.method() === 'PATCH' && new URL(request.url()).pathname.endsWith('/blog_posts'))
      saved = request.postDataJSON();
  });
  await mockApi(page, { admin: true, loggedIn: true, initialPosts: [{ ...post, content }] });
  await page.goto('/admin/');
  await openShelf(page);
  await page.locator('[data-open-post]').click();
  const editor = page.getByRole('textbox', { name: '文章正文', exact: true });
  await expect(editor.locator('h1')).toContainText('Notebook');
  await expect(editor.locator('table')).toBeVisible();
  await expect(editor).toContainText('const joints = 12;');
  expect(await page.evaluate(() => window.editorInjected)).toBeUndefined();
  await editor.click();
  await editor.press('ControlOrMeta+End');
  await page.keyboard.press('Enter');
  await page.keyboard.insertText('补充一条观察。');
  await expect(editor).toContainText('补充一条观察。');
  await page.locator('#quick-save').click();
  await expect(page.locator('#editor-status')).toContainText('已发布。');
  expect(saved.content).toContain('**bold**');
  expect(saved.content).toContain('[a link](https://example.com)');
  expect(saved.content).toContain('const joints = 12;');
  expect(saved.content).toMatch(/\|\s*Go2\s*\|\s*12\s*\|/);
  expect(saved.content).toContain('补充一条观察。');
  expect(await page.evaluate(() => window.editorInjected)).toBeUndefined();
});


test('images insert centered, drag side by side, undo, reopen and publish without visible URLs', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1100 });
  await mockApi(page, { admin: true, loggedIn: true, empty: true });
  let saved;
  page.on('request', request => {
    if (['POST', 'PATCH'].includes(request.method()) && new URL(request.url()).pathname.endsWith('/blog_posts'))
      saved = request.postDataJSON();
  });
  await page.goto('/admin/');
  await page.locator('#post-title').fill('Image notebook');
  const editor = page.getByRole('textbox', { name: '文章正文', exact: true });
  for (const [src, alt] of [['/favicon-32.png', 'First'], ['/favicon-16.png', 'Second']]) {
    await page.locator('[data-type="insert-image"]').click();
    await page.locator('#image-url').fill(src);
    await page.locator('#image-alt').fill(alt);
    await page.locator('.image-dialog [data-insert]').click();
  }
  await expect(editor.locator('.blog-image-row')).toHaveCount(2);
  const centered = await editor.locator('.blog-image-row').first().evaluate(row => {
    const a = row.getBoundingClientRect(), b = row.querySelector('img').getBoundingClientRect();
    return Math.abs(a.left + a.width / 2 - b.left - b.width / 2) < 2;
  });
  expect(centered).toBe(true);
  await page.waitForTimeout(850);
  const nodes = editor.locator('[data-type="img"]');
  await nodes.nth(1).dragTo(nodes.nth(0), { targetPosition: { x: 30, y: 15 } });
  await expect(editor.locator('.blog-image-pair')).toHaveCount(1);
  expect(await nodes.nth(0).locator('.vditor-ir__marker--link').evaluate(el => getComputedStyle(el).display)).toBe('none');
  await page.waitForTimeout(850);
  await page.locator('.vditor-toolbar [data-type="undo"]').click();
  await expect(editor.locator('.blog-image-row')).toHaveCount(2);
  await page.locator('.vditor-toolbar [data-type="redo"]').click();
  await expect(editor.locator('.blog-image-pair')).toHaveCount(1);

  await nodes.nth(1).click();
  await page.locator('[data-image-action="single"]').click();
  await expect(editor.locator('.blog-image-row')).toHaveCount(2);
  await page.locator('[data-image-action="pair"]').click();
  await expect(editor.locator('.blog-image-pair')).toHaveCount(1);
  await page.locator('#quick-save').click();
  await expect(page.locator('#editor-status')).toContainText('草稿已保存');
  expect(saved.content.trim()).toBe('![First](/favicon-32.png) ![Second](/favicon-16.png)');
  await openShelf(page);
  await page.locator('[data-open-post]').click();
  await expect(editor.locator('.blog-image-pair')).toHaveCount(1);
  await page.locator('#publish-post').click();
  await expect(page.locator('#editor-status')).toContainText('已发布。');
  const url = await page.locator('#view-post').getAttribute('href');
  await page.goto(url);
  await expect(page.locator('.markdown-body .blog-image-pair > img')).toHaveCount(2);
  await page.setViewportSize({ width: 390, height: 844 });
  await noOverflow(page);
  const boxes = await page.locator('.markdown-body img').evaluateAll(nodes => nodes.map(el => ({x:el.getBoundingClientRect().x,y:el.getBoundingClientRect().y})));
  expect(Math.abs(boxes[0].y - boxes[1].y)).toBeLessThan(2);
  expect(boxes[1].x).toBeGreaterThan(boxes[0].x);
});

test('local image selection, screenshot paste and file drop upload without embedding temporary URLs', async ({ page }) => {
  await mockApi(page, { admin: true, loggedIn: true, empty: true });
  const { readFile } = await import('node:fs/promises');
  const bytes = await readFile('public/favicon-32.png');
  let uploads = 0;
  await page.route(origin + '/storage/v1/object/blog-images/**', async route => {
    uploads++;
    await new Promise(resolve => setTimeout(resolve, 150));
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ Key: 'blog-images/test.png' }) });
  });
  await page.route(origin + '/storage/v1/object/public/blog-images/**', route => route.fulfill({ contentType: 'image/png', body: bytes }));
  await page.goto('/admin/');
  await page.locator('#post-title').fill('Uploaded photos');
  const editor = page.getByRole('textbox', { name: '文章正文', exact: true });
  await page.locator('[data-type="insert-image"]').click();
  await page.locator('.image-dialog input[type="file"]').setInputFiles({ name: 'diagram.png', mimeType: 'image/png', buffer: bytes });
  await expect(editor.locator('img')).toHaveCount(1);
  for (const kind of ['paste', 'drop']) {
    await editor.evaluate((el, { data, kind }) => {
      const bytes = Uint8Array.from(atob(data), c => c.charCodeAt(0));
      const transfer = new DataTransfer();
      transfer.items.add(new File([bytes], 'screenshot.png', { type: 'image/png' }));
      el.dispatchEvent(kind === 'paste'
        ? new ClipboardEvent('paste', { clipboardData: transfer, bubbles: true, cancelable: true })
        : new DragEvent('drop', { dataTransfer: transfer, bubbles: true, cancelable: true }));
    }, { data: bytes.toString('base64'), kind });
    await expect(editor.locator('img')).toHaveCount(kind === 'paste' ? 2 : 3);
  }
  expect(uploads).toBe(3);
  expect(await editor.locator('img').evaluateAll(nodes => nodes.every(el => el.src.includes('/storage/v1/object/public/blog-images/')))).toBe(true);
  await page.locator('#quick-save').click();
  await expect(page.locator('#editor-status')).toContainText('草稿已保存');
});

test('missing image storage explains the setup and does not lose the current article', async ({ page }) => {
  await mockApi(page, { admin: true, loggedIn: true, empty: true });
  await page.route(origin + '/storage/v1/object/blog-images/**', route => route.fulfill({
    status: 400, contentType: 'application/json', body: JSON.stringify({ statusCode: '404', error: 'not_found', message: 'Bucket not found' }),
  }));
  await page.goto('/admin/');
  await writeMarkdown(page, 'Keep this paragraph.');
  await page.locator('[data-type="insert-image"]').click();
  await page.locator('.image-dialog input[type="file"]').setInputFiles('public/favicon-32.png');
  await expect(page.locator('.image-notice')).toContainText('图片上传尚未启用');
  await expect(page.getByRole('textbox', { name: '文章正文', exact: true })).toContainText('Keep this paragraph.');
  await expect(page.locator('#quick-save')).toBeEnabled();
});

test('image border handles resize proportionally and preserve size through undo, settings, saving and publishing', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1400 });
  const picture = { ...post, content: 'Before\n\n![Robot](/assets/vop-real-world.png "Field trial")\n\nAfter' };
  await mockApi(page, { admin: true, loggedIn: true, initialPosts: [picture] });
  let saved;
  page.on('request', request => {
    if (request.method() === 'PATCH' && new URL(request.url()).pathname.endsWith('/blog_posts'))
      saved = request.postDataJSON();
  });
  await page.goto('/admin/');
  await openShelf(page); await page.locator('[data-open-post]').click();
  await page.locator('#toggle-shelf').click();
  const editor = page.getByRole('textbox', { name: '文章正文', exact: true });
  const img = editor.locator('img').first();
  await expect(img).toBeVisible();
  await img.click();
  const frame = page.locator('.image-resize-frame');
  await expect(frame).toBeVisible();
  const before = await img.boundingBox();
  await page.locator('[data-resize="se"]').hover();
  const handle = await page.locator('[data-resize="se"]').boundingBox();
  await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2);
  await page.mouse.down();
  await page.mouse.move(handle.x + handle.width / 2 - 170, handle.y + handle.height / 2 - 60, { steps: 12 });
  await page.mouse.up();
  const resized = await img.boundingBox();
  expect(resized.width).toBeLessThan(before.width - 200);
  expect(Math.abs(resized.width / resized.height - before.width / before.height)).toBeLessThan(.01);
  await expect(page.locator('.image-size-label')).toContainText('×');
  await page.locator('.vditor-toolbar [data-type="undo"]').click();
  await expect.poll(() => img.boundingBox().then(box => Math.round(box.width))).toBe(Math.round(before.width));
  await page.locator('.vditor-toolbar [data-type="redo"]').click();
  await expect.poll(() => img.boundingBox().then(box => Math.round(box.width))).toBe(Math.round(resized.width));

  await img.click();
  await page.locator('[data-image-action="edit"]').click();
  await page.locator('#image-alt').fill('Updated description');
  await page.locator('.image-dialog [data-insert]').click();
  expect(Math.abs((await img.boundingBox()).width - resized.width)).toBeLessThan(2);
  await page.locator('#quick-save').click();
  await expect(page.locator('#editor-status')).toContainText('已发布');
  expect(saved.content).toContain('Field trial mkdm-width:' + Math.round(resized.width));
  expect(saved.content).toContain('![Updated description]');
  expect(saved.content).not.toContain('image-resize-handle');

  await openShelf(page); await page.locator('[data-open-post]').click();
  await page.locator('#toggle-shelf').click();
  expect(Math.abs((await img.boundingBox()).width - resized.width)).toBeLessThan(2);
  await img.click();
  await page.locator('#focus-writing').click();
  await img.scrollIntoViewIfNeeded();
  await page.screenshot({ path: '.sites-runtime/image-resize-desktop.png', fullPage: true });
  const url = await page.locator('#view-post').getAttribute('href');
  await page.goto(url);
  const published = page.locator('.markdown-body img');
  expect(Math.abs((await published.boundingBox()).width - resized.width)).toBeLessThan(2);
  await expect(published).toHaveAttribute('title', 'Field trial');
  await page.setViewportSize({ width: 390, height: 844 });
  await noOverflow(page);
  const mobile = await published.boundingBox();
  expect(mobile.width).toBeLessThan(390);
  expect(Math.abs(mobile.width / mobile.height - resized.width / resized.height)).toBeLessThan(.01);
});

test('paired image resize keeps both images, supports keyboard sizing, cancel and reset', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1200 });
  await mockApi(page, { admin: true, loggedIn: true, initialPosts: [{
    ...post, content: '![One](/assets/vop-real-world.png) ![Two](/assets/vop-pipeline.png)\n\nText after.'
  }] });
  await page.goto('/admin/');
  await openShelf(page); await page.locator('[data-open-post]').click(); await page.locator('#toggle-shelf').click();
  const editor = page.getByRole('textbox', { name: '文章正文', exact: true });
  const imgs = editor.locator('img');
  await imgs.first().click();
  const original = await imgs.first().boundingBox();
  await page.locator('[data-resize="e"]').focus();
  await page.keyboard.press('Shift+ArrowLeft');
  await expect.poll(() => imgs.first().boundingBox().then(box => Math.round(box.width))).toBe(Math.round(original.width) - 50);
  const smaller = await imgs.first().boundingBox();
  const handle = await page.locator('[data-resize="e"]').boundingBox();
  await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2);
  await page.mouse.down(); await page.mouse.move(handle.x - 100, handle.y, { steps: 8 });
  await page.keyboard.press('Escape'); await page.mouse.up();
  expect(Math.abs((await imgs.first().boundingBox()).width - smaller.width)).toBeLessThan(2);
  await expect(editor.locator('.blog-image-pair')).toHaveCount(1);
  await page.locator('[data-image-action="reset-size"]').click();
  expect(Math.abs((await imgs.first().boundingBox()).width - original.width)).toBeLessThan(2);
  await page.setViewportSize({ width: 390, height: 844 });
  await imgs.first().click();
  await expect(page.locator('.image-resize-frame')).toBeVisible();
  await noOverflow(page);
  await page.screenshot({ path: '.sites-runtime/image-resize-mobile.png', fullPage: true });
});

test('math and italic survive editing, saving and public rendering with local assets', async ({ page }) => {
  const errors = [], failedAssets = [], externalAssets = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => {
    if (response.status() >= 400 && /katex|mhchem|woff/.test(response.url())) failedAssets.push(response.url());
  });
  page.on('request', request => {
    if (['script', 'stylesheet', 'font'].includes(request.resourceType()) &&
        new URL(request.url()).origin !== 'http://localhost:5173') externalAssets.push(request.url());
  });
  const content = String.raw`# Motion notes

*Learning in motion* 与 *中文斜体*。

速度$v=\frac{d}{t}$，以及$2x+1$。

$$
\begin{aligned}
J(\theta) &= \sum_{t=0}^{T} \gamma^t r_t \\
v &= \sqrt{x^2+y^2}
\end{aligned}
$$

$$
A=\begin{bmatrix}1&2\\3&4\end{bmatrix}
$$

${'`$literal$`'}

End of note.`;
  await mockApi(page, { admin: true, loggedIn: true, initialPosts: [{ ...post, content }] });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/admin/');
  await openShelf(page);
  await page.locator('[data-open-post]').click();
  const editor = page.getByRole('textbox', { name: '文章正文', exact: true });
  await expect(editor.locator('.katex')).toHaveCount(4);
  await expect(editor.locator('.katex-display')).toHaveCount(2);
  await expect(editor.locator('em').first()).toHaveCSS('font-style', 'italic');
  await expect(editor.locator('em').nth(1)).toHaveCSS('font-synthesis', 'style');
  await page.evaluate(() => document.fonts.ready);
  expect(await page.evaluate(() => [...document.fonts].some(font =>
    font.family === 'DM Sans Variable' && font.style === 'italic' && font.status === 'loaded'))).toBe(true);
  await expect(editor.locator('.vditor-reset--error')).toHaveCount(0);
  await editor.click();
  await editor.press('ControlOrMeta+End');
  await page.keyboard.press('Enter');
  await page.keyboard.insertText('公式保持可编辑。');
  await page.locator('#quick-save').click();
  await expect(page.locator('#editor-status')).toContainText('已发布。');
  await page.reload();
  await openShelf(page);
  await page.locator('[data-open-post]').click();
  await expect(editor.locator('.katex')).toHaveCount(4);
  await page.locator('#post-title').click();
  await editor.screenshot({ path: '.sites-runtime/math-editor.png' });
  await page.goto('/blog/?post=' + post.slug);
  const article = page.locator('.markdown-body');
  await expect(article.locator('.katex')).toHaveCount(4);
  await expect(article.locator('.katex-display')).toHaveCount(2);
  await expect(article.locator('em').first()).toHaveCSS('font-style', 'italic');
  await expect(article).toContainText('公式保持可编辑。');
  await expect(article.locator('code')).toHaveText('$literal$');
  const fraction = article.locator('.frac-line').first();
  expect((await fraction.boundingBox()).width).toBeGreaterThan(5);
  await page.screenshot({ path: '.sites-runtime/math-article.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await noOverflow(page);
  await expect(article.locator('.katex-display').first()).toBeVisible();
  expect(errors).toEqual([]);
  expect(failedAssets).toEqual([]);
  expect(externalAssets).toEqual([]);
});

test('typing Markdown renders inline math, display math and italics immediately', async ({ page }) => {
  await mockApi(page, { admin: true, loggedIn: true, empty: true });
  await page.goto('/admin/');
  const editor = page.getByRole('textbox', { name: '文章正文', exact: true });
  await editor.click();
  await page.keyboard.type('*Motion* and $x^2$ ');
  await page.keyboard.press('Enter');
  await expect(editor.locator('em')).toHaveCSS('font-style', 'italic');
  await expect(editor.locator('.katex')).toHaveCount(1);
  await page.keyboard.type('$$');
  await page.keyboard.press('Enter');
  await page.keyboard.type('v = \\frac{d}{t}');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('End');
  await page.keyboard.press('Enter');
  await page.locator('#post-title').fill('Math typing');
  await expect(editor.locator('.katex-display')).toHaveCount(1);
  await page.locator('#quick-save').click();
  await expect(page.locator('#editor-status')).toContainText('草稿已保存');
});
