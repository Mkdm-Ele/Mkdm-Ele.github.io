import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { JSDOM } from 'jsdom';

test('database enforces owner-only writes and hides drafts, even with direct queries', async t => {
  const db = new PGlite();
  t.after(() => db.close());
  const owner = '11111111-1111-4111-8111-111111111111';
  const visitor = '22222222-2222-4222-8222-222222222222';
  await db.exec(`
    create role anon nologin;
    create role authenticated nologin;
    create schema auth;
    create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth to anon, authenticated;
    insert into auth.users values ('${owner}'), ('${visitor}');
  `);
  const migration = await readFile(new URL('../supabase/001-blog.sql', import.meta.url), 'utf8');
  await db.exec(migration);
  async function as(role, uid, sql, params = []) {
    await db.exec('begin; set local role ' + role);
    try {
      await db.query("select set_config('request.jwt.claim.sub', $1, true)", [uid || '']);
      const result = await db.query(sql, params);
      await db.exec('commit');
      return result;
    } catch (error) { await db.exec('rollback'); throw error; }
  }
  await t.test('no automatic admin for the first login', async () => {
    assert.equal((await as('authenticated', owner, 'select public.is_blog_admin() as admin')).rows[0].admin, false);
    await assert.rejects(as('authenticated', owner,
      "insert into public.blog_posts (slug,title) values ('unauthorized','No')"), /row-level security/);
  });
  await db.query('insert into blog_private.owner (user_id) values ($1)', [owner]);
  const draft = (await as('authenticated', owner,
    "insert into public.blog_posts (slug,title,content) values ('private-draft','Private','Unpublished notes') returning *")).rows[0];
  const published = (await as('authenticated', owner,
    "insert into public.blog_posts (slug,title,content,status) values ('public-note','Public','Visible notes','published') returning *")).rows[0];
  await t.test('anonymous and other authenticated users can only read published posts', async () => {
    for (const [role, uid] of [['anon', ''], ['authenticated', visitor]]) {
      const result = await as(role, uid, 'select slug from public.blog_posts');
      assert.deepEqual(result.rows, [{ slug: 'public-note' }]);
      assert.equal((await as(role, uid, 'select public.is_blog_admin() as admin')).rows[0].admin, false);
    }
    assert.equal((await as('authenticated', owner, 'select id from public.blog_posts')).rows.length, 2);
    assert.ok(published.published_at);
    assert.equal(draft.published_at, null);
  });
  await t.test('other accounts cannot insert, update, delete, or grant themselves ownership', async () => {
    await assert.rejects(as('anon', '', "insert into public.blog_posts (slug,title) values ('anon','No')"), /permission denied/);
    await assert.rejects(as('authenticated', visitor, "insert into public.blog_posts (slug,title,status) values ('attacker','No','published')"), /row-level security/);
    assert.equal((await as('authenticated', visitor, "update public.blog_posts set title='Changed' returning id")).rows.length, 0);
    assert.equal((await as('authenticated', visitor, "delete from public.blog_posts returning id")).rows.length, 0);
    await assert.rejects(as('authenticated', visitor, 'select * from blog_private.owner'), /permission denied/);
    await assert.rejects(as('authenticated', visitor, 'insert into blog_private.owner values (true,$1)', [visitor]), /permission denied/);
    await assert.rejects(as('authenticated', owner, 'delete from blog_private.owner'), /permission denied/);
  });
  await t.test('owner can publish, unpublish and delete; old versions cannot overwrite newer edits', async () => {
    const updated = await as('authenticated', owner,
      "update public.blog_posts set status='published' where id=$1 and updated_at=$2 returning *",
      [draft.id, draft.updated_at]);
    assert.equal(updated.rows.length, 1);
    assert.ok(updated.rows[0].published_at);
    assert.equal((await as('anon', '', 'select id from public.blog_posts')).rows.length, 2);
    assert.equal((await as('authenticated', owner,
      "update public.blog_posts set title='Stale' where id=$1 and updated_at=$2 returning id",
      [draft.id, draft.updated_at])).rows.length, 0);
    await as('authenticated', owner, "update public.blog_posts set status='draft' where id=$1", [draft.id]);
    assert.equal((await as('anon', '', 'select id from public.blog_posts')).rows.length, 1);
    await as('authenticated', owner, 'delete from public.blog_posts where id=$1', [draft.id]);
    assert.equal((await as('authenticated', owner, 'select id from public.blog_posts')).rows.length, 1);
  });

  await t.test('image storage permits only the owner to upload, list and delete', async () => {
    // Model Supabase's pre-existing storage schema; policies are from the real migration.
    await db.exec(`
      create schema storage;
      create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
      create table storage.objects (id int generated always as identity primary key, bucket_id text, name text);
      alter table storage.objects enable row level security;
      grant usage on schema storage to anon, authenticated;
      grant select, insert, delete on storage.objects to anon, authenticated;
      grant usage on all sequences in schema storage to anon, authenticated;
    `);
    const images = await readFile(new URL('../supabase/003-blog-images.sql', import.meta.url), 'utf8');
    await db.exec(images);
    for (const [role, uid] of [['anon', ''], ['authenticated', visitor]]) {
      await assert.rejects(as(role, uid, "insert into storage.objects(bucket_id,name) values ('blog-images','denied.png')"), /row-level security/);
    }
    await as('authenticated', owner, "insert into storage.objects(bucket_id,name) values ('blog-images','photo.png')");
    await assert.rejects(as('authenticated', owner, "insert into storage.objects(bucket_id,name) values ('other-bucket','photo.png')"), /row-level security/);
    assert.equal((await as('authenticated', visitor, 'select * from storage.objects')).rows.length, 0);
    assert.equal((await as('authenticated', visitor, 'delete from storage.objects returning id')).rows.length, 0);
    assert.equal((await as('authenticated', owner, 'select * from storage.objects')).rows.length, 1);
    await db.exec(images);
    assert.equal((await as('authenticated', owner, 'delete from storage.objects returning id')).rows.length, 1);
  });
  await t.test('setup can be rerun without dropping articles or resetting the owner', async () => {
    await db.exec(migration);
    assert.equal((await as('authenticated', owner, 'select public.is_blog_admin() as admin')).rows[0].admin, true);
    assert.equal((await as('anon', '', 'select id from public.blog_posts')).rows.length, 1);
  });
});

test('Markdown is readable while executable HTML and unsafe links are removed', async () => {
  const dom = new JSDOM('');
  globalThis.window = dom.window;
  const { renderMarkdown, validatePost } = await import('../src/blog/content.js');
  const html = renderMarkdown(`# Heading

**Bold** and [source](https://example.com).

| Topic | Value |
| --- | --- |
| Test | Pass |

<script>alert(1)</script>
<img src="x" onerror="alert(1)">
<a href="javascript:alert(1)">unsafe</a>
<svg onload="alert(1)"></svg>
<iframe src="https://example.com"></iframe>
<div style="position:fixed" id="app">content</div>`);
  const doc = new JSDOM(html).window.document;
  assert.equal(doc.querySelector('h1').textContent, 'Heading');
  assert.ok(doc.querySelector('strong'));
  assert.ok(doc.querySelector('table'));
  assert.equal(doc.querySelector('a').getAttribute('href'), 'https://example.com');
  assert.equal(doc.querySelectorAll('script,svg,iframe,[onerror],[style],[id]').length, 0);
  assert.ok([...doc.querySelectorAll('a')].every(a => !a.getAttribute('href')?.startsWith('javascript:')));
  assert.ok(validatePost({ title: 'Title', slug: 'valid', excerpt: '', content: '', status: 'published' }));
  assert.equal(validatePost({ title: 'Title', slug: 'valid', excerpt: '', content: '# Text', status: 'published' }), null);

  const photos = new JSDOM(renderMarkdown('![First](/a.png) ![Second](/b.png)\n\n![Single](/c.png)\n\nText ![Inline](/d.png) here.')).window.document;
  assert.equal(photos.querySelectorAll('.blog-image-pair > img').length, 2);
  assert.equal(photos.querySelectorAll('.blog-image-row').length, 2);
  assert.ok(photos.body.textContent.includes('Text'));

  const sizes = new JSDOM(renderMarkdown('![Sized](/photo.png "Field trial mkdm-width:320")\n\n![Bad](/bad.png "mkdm-width:9999")')).window.document;
  const sized = sizes.querySelector('img');
  assert.equal(sized.style.getPropertyValue('--image-width'), '320px');
  assert.equal(sized.getAttribute('title'), 'Field trial');
  assert.equal(sizes.querySelectorAll('img.blog-image-sized').length, 1);
  assert.equal(sizes.querySelectorAll('img')[1].getAttribute('style'), null);
  const { imageMarkdown, imageSize, imageTitleWithWidth } = await import('../src/blog/image-content.js');
  assert.equal(imageMarkdown('/a.png', 'A'), '![A](/a.png)');
  assert.equal(imageTitleWithWidth('Caption mkdm-width:320', 240), 'Caption mkdm-width:240');
  assert.equal(imageTitleWithWidth('Caption mkdm-width:320', null), 'Caption');
  assert.equal(imageSize('mkdm-width:0').width, null);
  dom.window.close();
});
