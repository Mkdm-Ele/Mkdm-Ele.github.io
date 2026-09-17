import { copyFile, mkdir, cp } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const source = dirname(require.resolve('vditor/package.json'));
const destination = fileURLToPath(new URL('../public/vendor/vditor/', import.meta.url));
// Runtime assets stay on our own origin, and match the locked editor version.
for (const path of ['dist/js/lute/lute.min.js', 'dist/js/i18n/zh_CN.js', 'dist/js/icons/ant.js', 'dist/css/content-theme/light.css']) {
  const target = join(destination, path);
  await mkdir(dirname(target), { recursive: true });
  await copyFile(join(source, path), target);
}
await copyFile(join(source, 'LICENSE'), join(destination, 'LICENSE'));

// Vditor loads math on demand. Use the same locked KaTeX release as public articles.
const katexSource = dirname(require.resolve('katex/package.json'));
const katexTarget = join(destination, 'dist/js/katex');
await mkdir(katexTarget, { recursive: true });
for (const file of ['katex.min.js', 'katex.min.css']) {
  await copyFile(join(katexSource, 'dist', file), join(katexTarget, file));
}
await copyFile(join(katexSource, 'dist/contrib/mhchem.min.js'), join(katexTarget, 'mhchem.min.js'));
await cp(join(katexSource, 'dist/fonts'), join(katexTarget, 'fonts'), { recursive: true });
await copyFile(join(katexSource, 'LICENSE'), join(katexTarget, 'LICENSE'));
