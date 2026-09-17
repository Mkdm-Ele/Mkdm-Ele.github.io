import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

test('LaTeX and emphasis render without weakening authored HTML sanitization', async () => {
  globalThis.window = new JSDOM('').window;
  const { renderMarkdown } = await import('../src/blog/content.js');
  const source = String.raw`*italic* 与 *中文斜体*，行内$x_1^2+\alpha$继续。

$$
\begin{aligned}
v &= \frac{d}{t} \\
J &= \sum_{i=1}^{n} r_i + \sqrt{x}
\end{aligned}
$$

${'`$not_math$`'} and \$escaped\$.

<em style="position:fixed" onclick="alert(1)">safe emphasis</em>

$\href{javascript:alert(1)}{click}$

$\frac{broken}$

<img src=x onerror=alert(1)>

<script>alert(1)</script>`;
  const doc = new JSDOM(renderMarkdown(source)).window.document;
  assert.equal(doc.querySelectorAll('em').length, 3);
  assert.equal(doc.querySelectorAll('.blog-math-block .katex').length, 1);
  assert.equal(doc.querySelectorAll('.blog-math-inline .katex').length, 2);
  assert.ok(doc.querySelector('.katex .frac-line'));
  assert.ok(doc.querySelector('.katex svg'));
  assert.ok(doc.querySelector('.katex math'));
  assert.ok(doc.querySelector('.katex-error'));
  assert.equal(doc.querySelector('code').textContent, '$not_math$');
  assert.ok(doc.body.textContent.includes('$escaped$'));
  assert.equal(doc.querySelector('em[style]'), null);
  assert.equal(doc.querySelectorAll('script,[onerror],[onclick],a[href^="javascript:"]').length, 0);
  assert.equal(doc.querySelector('[class*="math-slot-"]'), null);
});
