import Vditor from 'vditor';
import 'vditor/dist/index.css';
import './editor.css';
import { installImageTools } from './image-tools.js';

export function createMarkdownEditor(container, { onChange, onBusyChange }) {
  return new Promise((resolve, reject) => {
    let editor, imageTools;
    const deadline = setTimeout(() => reject(new Error('编辑器加载超时，请刷新页面重试。')), 20000);
    editor = new Vditor(container, {
      cdn: '/vendor/vditor',
      mode: 'ir',
      lang: 'zh_CN',
      theme: 'classic',
      height: 'auto',
      minHeight: 640,
      cache: { enable: false },
      resize: { enable: false },
      outline: { enable: false },
      placeholder: '从一个想法开始…',
      toolbar: ['headings', 'bold', 'italic', 'strike', '|', 'list', 'ordered-list', 'check',
        '|', 'quote', 'code', 'inline-code', 'link',
        { name: 'insert-image', tip: '插入图片', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r="1.5"/><path d="m3 17 6-6 4 4 3-3 5 5"/></svg>', click: () => imageTools?.open() },
        'table', '|', 'undo', 'redo'],
      toolbarConfig: { pin: false },
      preview: {
        maxWidth: 1080,
        hljs: { enable: false },
        math: { engine: 'KaTeX', inlineDigit: true },
        markdown: { sanitize: true, codeBlockPreview: false, mathBlockPreview: true,
          toc: false, footnotes: false, autoSpace: false, fixTermTypo: false, callout: false },
        actions: [],
      },
      link: { isOpen: false },
      image: { isPreview: false },
      hint: { emoji: {}, extend: [], parse: false },
      input: value => onChange(value),
      after() {
        clearTimeout(deadline);
        editor.vditor.lute.SetInlineMath?.(true);
        const content = container.querySelector('.vditor-ir [contenteditable]');
        content.setAttribute('role', 'textbox');
        content.setAttribute('aria-label', '文章正文');
        content.setAttribute('aria-multiline', 'true');
        content.setAttribute('spellcheck', 'false');
        // The input callback is debounced by Vditor; flag dirty synchronously as well.
        content.addEventListener('input', () => onChange(editor.getValue()));
        imageTools = installImageTools({ container, content, editor, onChange, onBusyChange });
        container.querySelectorAll('button').forEach(button => button.type = 'button');
        resolve({
          getValue: () => editor.getValue(),
          setValue: value => {
            editor.setValue(value, true);
            imageTools.reset();
            // An editable trailing paragraph lets the caret leave an HTML/code block.
            if (content.lastElementChild?.matches('[data-type="html-block"], [data-type="code-block"]')) {
              const paragraph = document.createElement('p');
              paragraph.dataset.block = '0';
              paragraph.append(document.createElement('br'));
              content.append(paragraph);
            }
          },
          setDisabled: disabled => { disabled ? editor.disabled() : editor.enable(); imageTools.setDisabled(disabled); },
          focus: () => editor.focus(),
          destroy: () => { clearTimeout(deadline); imageTools.destroy(); editor.destroy(); },
        });
      },
    });
  });
}
