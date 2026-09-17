import { mkdir, readFile, writeFile } from 'node:fs/promises';
// Physical entry pages work on static hosting without a catch-all rewrite.
// Article addresses use /blog/?post=slug so direct links also survive refresh.
const html = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
for (const [page, title] of [['blog', 'Notebook'], ['admin', 'Writer’s desk']]) {
  const path = new URL('../dist/' + page + '/', import.meta.url);
  await mkdir(path, { recursive: true });
  const output = html.replace(/<title>.*?<\/title>/s, '<title>' + title + ' · Mkdm-Ele</title>')
    .replace('</head>', page === 'admin' ? '<meta name="robots" content="noindex,nofollow"></head>' : '</head>');
  await writeFile(new URL('index.html', path), output);
}
