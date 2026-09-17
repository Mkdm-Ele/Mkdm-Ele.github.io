import { decorateImageRows, imageMarkdown, imageUrl, imageTitle, imageTitleWithWidth } from './image-content.js';
import { installImageResize } from './image-resize.js';
import { uploadBlogImage, validateImageFile } from './image-upload.js';

export function installImageTools({ container, content, editor, onChange, onBusyChange }) {
 let resizeControls;
 let pointer = null, ghost = null, suppressClick = false;
 let selected = null, dragging = null, dropTarget = null, savedRange = null, editing = null;
 let disabled = false, uploading = false, destroyed = false, refreshFrame = 0;
 const listeners = [];
 const listen = (node, type, fn, options) => { node.addEventListener(type, fn, options); listeners.push(() => node.removeEventListener(type, fn, options)); };
 const imageNodes = () => [...content.querySelectorAll('[data-type="img"]')];
 const toolbar = document.createElement('div');
 toolbar.className = 'image-tools'; toolbar.hidden = true;
 toolbar.setAttribute('role', 'group'); toolbar.setAttribute('aria-label', '图片操作');
 toolbar.innerHTML = '<span>拖动边框调整大小；拖动图片调整位置</span><div><button type="button" data-image-action="edit">图片设置</button><button type="button" data-image-action="pair">与上一张并排</button><button type="button" data-image-action="single">独占一行</button><button type="button" data-image-action="reset-size">恢复默认大小</button><button type="button" data-image-action="up">上移</button><button type="button" data-image-action="down">下移</button><button type="button" data-image-action="remove">移除图片</button></div>';
 container.querySelector('.vditor-toolbar').after(toolbar);
 const notice = document.createElement('p');
 notice.className = 'image-notice'; notice.hidden = true; notice.setAttribute('role', 'status');
 toolbar.after(notice);
 const dialog = document.createElement('dialog');
 dialog.className = 'image-dialog'; dialog.setAttribute('aria-labelledby', 'image-dialog-title');
 dialog.innerHTML = `<form><div class="image-dialog-heading"><h2 id="image-dialog-title">插入图片</h2><button type="button" data-close aria-label="关闭图片窗口">×</button></div>
 <p class="image-dialog-intro">插入后默认居中，也可以将两张图片拖到同一行。</p>
 <label for="image-url">图片链接</label><input id="image-url" type="text" placeholder="https://…" autocomplete="off">
 <label for="image-alt">图片说明</label><input id="image-alt" type="text" maxlength="300" placeholder="为图片写一句说明（可选）">
 <p class="image-dialog-error" role="alert"></p>
 <div class="image-dialog-actions"><button type="button" class="soft-button" data-file>选择本地图片</button><button type="submit" class="soft-button primary-button" data-insert>插入图片</button></div>
 <p class="image-file-hint">也可粘贴截图或将图片文件拖入正文。PNG / JPG / WebP / GIF / AVIF，每张不超过 6 MB。</p>
 </form>`;
 document.body.append(dialog);
 const fileInput = document.createElement('input');
 fileInput.type = 'file'; fileInput.accept = 'image/png,image/jpeg,image/webp,image/gif,image/avif'; fileInput.multiple = true; fileInput.hidden = true;
 dialog.append(fileInput);
 const indicator = document.createElement('div');
 indicator.className = 'image-drop-line'; indicator.hidden = true; document.body.append(indicator);

 function notify(message, error = false) {
  notice.hidden = !message; notice.textContent = message; notice.classList.toggle('is-error', error);
 }
 function refresh() {
  if (destroyed) return;
  if (!resizeControls?.isResizing()) decorateImageRows(content, true);
  imageNodes().forEach(node => {
   node.setAttribute('contenteditable', 'false'); node.draggable = false;
   node.classList.toggle('image-selected', node === selected);
   node.tabIndex = disabled ? -1 : 0;
   node.setAttribute('role', 'button');
   node.setAttribute('aria-label', '图片：' + (node.querySelector('img')?.alt || '未命名') + '，按回车显示操作');
   const img = node.querySelector('img');
   if (img) { img.draggable = false; img.title = '拖动调整位置，点击显示缩放边框和图片操作'; }
  });
  if (selected && !selected.isConnected) selected = null;
  toolbar.hidden = !selected;
  toolbar.querySelectorAll('button').forEach(button => button.disabled = disabled);
  resizeControls?.refresh();
 }
 const observer = new MutationObserver(() => {
  cancelAnimationFrame(refreshFrame); refreshFrame = requestAnimationFrame(refresh);
 });
 observer.observe(content, { childList: true, subtree: true, characterData: true });

 function saveRange() {
  const selection = window.getSelection();
  if (selection.rangeCount && content.contains(selection.getRangeAt(0).commonAncestorContainer))
   savedRange = selection.getRangeAt(0).cloneRange();
 }
 function restoreRange() {
  content.focus();
  const selection = window.getSelection(), range = savedRange;
  if (range && content.contains(range.commonAncestorContainer)) {
   selection.removeAllRanges(); selection.addRange(range);
  } else {
   const end = document.createRange(); end.selectNodeContents(content); end.collapse(false);
   selection.removeAllRanges(); selection.addRange(end);
  }
 }
 function ensureTrailing() {
  if (!content.lastElementChild || content.lastElementChild.querySelector('[data-type="img"]')) {
   const p = document.createElement('p'); p.dataset.block = '0'; p.innerHTML = '<br>'; content.append(p);
  }
 }
 function commit(nextSelection = null) {
  const index = imageNodes().indexOf(nextSelection);
  const markdown = editor.vditor.lute.VditorIRDOM2Md(content.innerHTML);
  editor.setValue(markdown, false);
  ensureTrailing();
  selected = index < 0 ? null : imageNodes()[index];
  refresh(); onChange(editor.getValue());
 }
 function cleanParagraph(paragraph) {
  if (paragraph?.tagName === 'P' && !paragraph.textContent.trim() && !paragraph.querySelector('img'))
   paragraph.remove();
 }
 function directBlock(node) {
  let block = node;
  while (block?.parentElement && block.parentElement !== content) block = block.parentElement;
  return block?.parentElement === content ? block : null;
 }
 function makeParagraph() {
  const p = document.createElement('p'); p.dataset.block = '0'; return p;
 }
 function moveImage(node, target, side) {
  if (!node?.isConnected || !target?.isConnected || node === target) return;
  const oldParagraph = node.closest('p');
  if (side === 'left' || side === 'right') {
   const row = target.closest('p');
   if (!row?.classList.contains('blog-image-row')) return;
   if (side === 'left') target.before(node, document.createTextNode(' '));
   else target.after(document.createTextNode(' '), node);
  } else {
   const block = directBlock(target);
   if (!block || block === oldParagraph && oldParagraph.querySelectorAll('[data-type="img"]').length === 1) return;
   const paragraph = makeParagraph(); paragraph.append(node);
   if (side === 'before') block.before(paragraph); else block.after(paragraph);
  }
  cleanParagraph(oldParagraph); commit(node);
 }
 function open(edit = false) {
  if (disabled) return;
  saveRange(); editing = edit ? selected : null;
  const img = editing?.querySelector('img');
  dialog.querySelector('#image-dialog-title').textContent = editing ? '图片设置' : '插入图片';
  dialog.querySelector('[data-insert]').textContent = editing ? '应用设置' : '插入图片';
  dialog.querySelector('#image-url').value = img?.getAttribute('src') || '';
  dialog.querySelector('#image-alt').value = img?.getAttribute('alt') || '';
  dialog.querySelector('.image-dialog-error').textContent = '';
  dialog.querySelector('[data-file]').hidden = Boolean(editing);
  dialog.showModal();
 }
 function insertImages(images, placement) {
  const md = images.map(image => imageMarkdown(image.src, image.alt)).join('\n\n');
  const temp = document.createElement('div'); temp.innerHTML = editor.vditor.lute.Md2VditorIRDOM(md);
  const paragraphs = [...temp.children];
  if (placement?.node?.isConnected) {
   const block = directBlock(placement.node);
   if (placement.side === 'before') block.before(...paragraphs); else block.after(...paragraphs);
  } else {
   restoreRange();
   const range = window.getSelection().getRangeAt(0);
   const node = range.startContainer.nodeType === Node.TEXT_NODE ? range.startContainer.parentElement : range.startContainer;
   const block = directBlock(node);
   if (block) block.after(...paragraphs);
   else if (range.startContainer === content && content.children[range.startOffset])
    content.children[range.startOffset].before(...paragraphs);
   else content.append(...paragraphs);
  }
  const nextIndex = [...content.children].indexOf(paragraphs.at(-1)) + 1;
  commit();
  const next = content.children[nextIndex] || content.lastElementChild;
  if (next) {
   const range = document.createRange(); range.selectNodeContents(next); range.collapse(true);
   savedRange = range; restoreRange();
  }
 }
 async function uploadFiles(files, placement) {
  if (disabled || uploading || !files.length) return;
  try { files.forEach(validateImageFile); } catch (error) { notify(error.message, true); return; }
  saveRange(); uploading = true; onBusyChange?.(true);
  const successes = []; let failure;
  notify('正在上传图片…');
  try {
   for (let i = 0; i < files.length; i++) {
    notify('正在上传图片 ' + (i + 1) + ' / ' + files.length + '…');
    try { successes.push(await uploadBlogImage(files[i])); }
    catch (error) { failure = error; break; }
   }
  } finally {
   uploading = false;
   if (!destroyed) {
    onBusyChange?.(false);
    if (successes.length) insertImages(successes, placement);
    notify(failure ? failure.message : '图片已插入；拖到另一张图片左右侧即可并排。', Boolean(failure));
   }
  }
 }

 listen(dialog.querySelector('form'), 'submit', event => {
  event.preventDefault();
  try {
   const src = imageUrl(dialog.querySelector('#image-url').value);
   const alt = dialog.querySelector('#image-alt').value;
   if (editing?.isConnected) {
    const temp = document.createElement('div');
    temp.innerHTML = editor.vditor.lute.Md2VditorIRDOM(imageMarkdown(src, alt, imageTitle(editing)));
    const node = temp.querySelector('[data-type="img"]'); editing.replaceWith(node);
    commit(node);
   } else insertImages([{ src, alt }]);
   dialog.close(); notify('');
  } catch (error) { dialog.querySelector('.image-dialog-error').textContent = error.message; }
 });
 listen(dialog, 'keydown', event => { if (event.key === 'Escape') event.stopPropagation(); });
 listen(dialog.querySelector('[data-close]'), 'click', () => dialog.close());
 listen(dialog.querySelector('[data-file]'), 'click', () => fileInput.click());
 listen(fileInput, 'change', () => {
  const files = [...fileInput.files]; fileInput.value = ''; dialog.close(); uploadFiles(files);
 });
 listen(content, 'click', event => {
  if (suppressClick && performance.now() - suppressClick < 250) { suppressClick = false; event.preventDefault(); event.stopImmediatePropagation(); return; }
  const node = event.target.closest('[data-type="img"]');
  if (node) { event.preventDefault(); event.stopImmediatePropagation(); selected = node; refresh(); }
 }, true);
 listen(toolbar, 'mousedown', event => event.preventDefault());
 listen(toolbar, 'click', event => {
  const action = event.target.closest('[data-image-action]')?.dataset.imageAction;
  if (!action || disabled || !selected) return;
  const nodes = imageNodes(), index = nodes.indexOf(selected), block = directBlock(selected);
  if (action === 'edit') return open(true);
  if (action === 'reset-size') { rememberImageEdit(); resizeImage(selected, null); return; }
  if (action === 'pair') {
   if (!nodes[index - 1]) return notify('先插入另一张图片，再将它们并排。');
   moveImage(selected, nodes[index - 1], 'right');
  } else if (action === 'single') {
   const row = selected.closest('p');
   if (row?.classList.contains('blog-image-pair')) moveImage(selected, row, 'after');
  } else if (action === 'up' || action === 'down') {
   const target = action === 'up' ? block?.previousElementSibling : block?.nextElementSibling;
   if (target) moveImage(selected, target, action === 'up' ? 'before' : 'after');
  } else if (action === 'remove') {
   const row = selected.closest('p'); selected.remove(); cleanParagraph(row); commit();
  }
 });
 listen(document, 'pointerdown', event => {
  if (!container.contains(event.target) && !dialog.contains(event.target) && !resizeControls?.contains(event.target)) { selected = null; refresh(); }
 });
 listen(content, 'keydown', event => {
  const image = event.target.closest('[data-type="img"]');
  if (!disabled && image && ['Enter', ' '].includes(event.key)) {
   event.preventDefault(); event.stopImmediatePropagation(); selected = image; refresh(); return;
  }
  if (disabled || !selected || !['Delete', 'Backspace'].includes(event.key)) return;
  event.preventDefault(); event.stopImmediatePropagation();
  const row = selected.closest('p'); selected.remove(); cleanParagraph(row); commit();
 }, true);
 listen(content, 'pointerdown', event => {
  if (!event.target.closest('[data-type="img"]')) { selected = null; refresh(); }
 }, true);
 function clearDrop() { indicator.hidden = true; dropTarget = null; dragging = null; }
 function showDrop(node, side) {
  const rect = node.getBoundingClientRect();
  const vertical = side === 'left' || side === 'right';
  Object.assign(indicator.style, {
   left: (vertical ? (side === 'left' ? rect.left - 6 : rect.right + 3) : rect.left) + 'px',
   top: (vertical ? rect.top : side === 'before' ? rect.top - 4 : rect.bottom + 1) + 'px',
   width: (vertical ? 3 : rect.width) + 'px', height: (vertical ? rect.height : 3) + 'px',
  });
  indicator.hidden = false; dropTarget = { node, side };
 }
 function locateDrop(x, y, files = false) {
  const target = document.elementFromPoint(x, y);
  if (!target || !content.contains(target)) { indicator.hidden = true; dropTarget = null; return; }
  const image = target.closest('[data-type="img"]');
  const block = directBlock(target);
  if (image && image !== dragging && image.closest('p')?.classList.contains('blog-image-row') && !files) {
   const rect = image.getBoundingClientRect(), fraction = (x - rect.left) / rect.width;
   const side = fraction < .33 ? 'left' : fraction > .67 ? 'right' : y < rect.top + rect.height / 2 ? 'before' : 'after';
   showDrop(side === 'before' || side === 'after' ? image.closest('p') : image, side);
  } else if (block && !block.contains(dragging)) {
   const rect = block.getBoundingClientRect();
   showDrop(block, y < rect.top + rect.height / 2 ? 'before' : 'after');
  } else { dropTarget = null; indicator.hidden = true; }
 }
 listen(content, 'dragstart', event => {
  if (event.target.closest('[data-type="img"]')) { event.preventDefault(); event.stopImmediatePropagation(); }
 }, true);
 listen(content, 'pointerdown', event => {
  const node = event.target.closest('[data-type="img"]');
  if (!node || disabled || event.button !== 0) return;
  event.preventDefault(); event.stopImmediatePropagation();
  pointer = { node, x: event.clientX, y: event.clientY };
 }, true);
 listen(document, 'pointermove', event => {
  if (!pointer) return;
  if (!dragging && Math.hypot(event.clientX-pointer.x, event.clientY-pointer.y) < 6) return;
  event.preventDefault();
  if (!dragging) {
   dragging = pointer.node;
   ghost = dragging.querySelector('img').cloneNode(true); ghost.className = 'image-drag-ghost';
   ghost.removeAttribute('id'); document.body.append(ghost);
  }
  ghost.style.left = (event.clientX + 16) + 'px'; ghost.style.top = (event.clientY + 16) + 'px';
  if (event.clientY < 70) window.scrollBy(0, -20);
  else if (event.clientY > innerHeight - 70) window.scrollBy(0, 20);
  locateDrop(event.clientX, event.clientY);
 }, { passive: false });
 function finishPointer(cancel = false) {
  if (!pointer) return;
  const source = dragging, target = dropTarget;
  pointer = null; ghost?.remove(); ghost = null; clearDrop();
  if (source) {
   suppressClick = performance.now();
   if (!cancel && target) moveImage(source, target.node, target.side);
  }
 }
 listen(document, 'pointerup', () => finishPointer());
 listen(document, 'pointercancel', () => finishPointer(true));
 listen(content, 'dragover', event => {
  const files = event.dataTransfer?.types.includes('Files');
  if (disabled || (!dragging && !files)) return;
  event.preventDefault(); event.stopImmediatePropagation(); event.dataTransfer.dropEffect = files ? 'copy' : 'move';
  locateDrop(event.clientX, event.clientY, files);
 }, true);
 listen(content, 'drop', event => {
  if (disabled || (!dragging && !event.dataTransfer?.files.length)) return;
  event.preventDefault(); event.stopImmediatePropagation();
  const target = dropTarget, source = dragging, files = [...event.dataTransfer.files];
  clearDrop();
  if (files.length) uploadFiles(files, target);
  else if (source && target) moveImage(source, target.node, target.side);
 }, true);
 listen(content, 'dragend', clearDrop, true);
 listen(content, 'paste', event => {
  const files = [...(event.clipboardData?.files || [])];
  if (!files.length) return;
  event.preventDefault(); event.stopImmediatePropagation(); uploadFiles(files);
 }, true);
 function rememberImageEdit() {
  // Image gestures are discrete actions, independent of Vditor's typing debounce.
  // Keep a valid caret beside this image for Vditor's undo/redo restoration.
  if (selected?.isConnected) {
   const range = document.createRange(); range.setStartBefore(selected); range.collapse(true);
   const selection = window.getSelection(); selection.removeAllRanges(); selection.addRange(range);
  }
  clearTimeout(editor.vditor.ir.processTimeoutId);
  editor.vditor.undo.addToUndoStack(editor.vditor);
 }
 function resizeImage(node, width) {
  const img = node.querySelector('img');
  const title = imageTitleWithWidth(imageTitle(node), width);
  const temp = document.createElement('div');
  temp.innerHTML = editor.vditor.lute.Md2VditorIRDOM(imageMarkdown(img.getAttribute('src'), img.alt, title));
  const replacement = temp.querySelector('[data-type="img"]');
  node.replaceWith(replacement); commit(replacement);
  rememberImageEdit();
 }
 resizeControls = installImageResize({ content, getSelected: () => selected, isDisabled: () => disabled,
  onStart: rememberImageEdit, onCommit: resizeImage });
 refresh();
 return {
  open,
  reset() { resizeControls.cancel(); finishPointer(true); selected = null; savedRange = null; clearDrop(); notify(''); ensureTrailing(); refresh(); },
  setDisabled(value) { if (value) resizeControls.cancel(); disabled = value; refresh(); },
  isUploading: () => uploading,
  destroy() {
   destroyed = true; resizeControls.destroy(); finishPointer(true); observer.disconnect(); cancelAnimationFrame(refreshFrame);
   listeners.forEach(remove => remove()); toolbar.remove(); notice.remove(); dialog.remove(); indicator.remove();
  },
 };
}
