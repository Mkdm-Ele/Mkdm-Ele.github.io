import { Marked } from 'marked';
import markedKatex from 'marked-katex-extension';

export function createMathMarkdown(source) {
  const formulas = [];
  const slot = `math-slot-${crypto.randomUUID()}`;
  const math = markedKatex({ nonStandard: true, throwOnError: false, trust: false,
    strict: 'ignore', maxSize: 20, maxExpand: 1000 });
  for (const extension of math.extensions) {
    const render = extension.renderer;
    extension.renderer = token => {
      const index = formulas.push({ html: render(token), display: token.displayMode }) - 1;
      return `<span class="${slot}">${index}</span>`;
    };
  }
  const parser = new Marked({ gfm: true, breaks: false }, math);
  return {
    html: parser.parse(source),
    renderMath(fragment) {
      // Sanitize all authored HTML first, then insert only KaTeX-generated markup.
      // Its layout requires styles/SVG/MathML; keep these forbidden in user HTML.
      fragment.querySelectorAll(`.${slot}`).forEach(node => {
        const formula = formulas[Number(node.textContent)];
        if (!formula) return;
        node.className = formula.display ? 'blog-math-block' : 'blog-math-inline';
        node.innerHTML = formula.html;
      });
    },
  };
}
