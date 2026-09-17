export function pageShell(main) {
  return `<a class="skip-link" href="#blog-main">Skip to content</a>
  <div class="site-shell blog-shell">
    <header class="site-header"><a href="/" class="wordmark" aria-label="Mkdm-Ele home">m<span class="wordmark-k">k</span><span class="wordmark-dot">.</span><span class="wordmark-name">Mkdm-Ele</span></a>
      <nav aria-label="Main navigation"><a href="/#playground">Playground</a><a href="/#research">Research</a><a href="/blog" aria-current="page">Blog</a></nav>
    </header><main id="blog-main" tabindex="-1">${main}</main>
    <footer class="site-footer"><span>Mkdm-Ele <span class="footer-slash">/</span> A work in motion.</span><a href="/admin">Writer’s desk ↗</a><a href="https://github.com/Mkdm-Ele" target="_blank" rel="noopener noreferrer">GitHub ↗</a></footer>
  </div>`;
}
