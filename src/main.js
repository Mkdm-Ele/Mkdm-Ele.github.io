import './style.css';
import './blog/blog.css';
import '@fontsource-variable/dm-sans';
import '@fontsource-variable/dm-sans/wght-italic.css';
import '@fontsource/dm-mono/400.css';

const path = location.pathname.replace(/\/+$/, '') || '/';
try {
  if (path === '/admin') {
    const { renderAdmin } = await import('./blog/admin.js');
    await renderAdmin();
  } else if (path === '/blog') {
    const { renderBlog } = await import('./blog/public.js');
    await renderBlog();
  } else if (path === '/') {
    await import('./home.js');
  } else {
    document.querySelector('#app').innerHTML = '<main class="site-shell journal-page"><h1>Page not found.</h1><a href="/">Back home ↗</a></main>';
  }
} catch (error) {
  console.error('Page could not load:', error);
  const message = document.createElement('p');
  message.textContent = '页面暂时无法打开，请刷新重试。' + (error?.message || '');
  const main = document.createElement('main');
  main.className = 'site-shell journal-page';
  const link = document.createElement('a');
  link.href = '/';
  link.textContent = '返回首页';
  main.append(message, link);
  document.querySelector('#app').replaceChildren(main);
}
