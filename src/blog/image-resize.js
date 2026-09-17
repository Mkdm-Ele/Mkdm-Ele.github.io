export function installImageResize({ content, getSelected, isDisabled, onStart, onCommit }) {
 let gesture = null, frame = 0, observed = null;
 const listeners = [];
 const listen = (node, type, fn, options) => { node.addEventListener(type, fn, options); listeners.push(() => node.removeEventListener(type, fn, options)); };
 const overlay = document.createElement('div');
 overlay.className = 'image-resize-frame'; overlay.hidden = true;
 overlay.setAttribute('role', 'group'); overlay.setAttribute('aria-label', '调整图片大小');
 const directions = { nw: '左上角', n: '上边', ne: '右上角', e: '右边', se: '右下角', s: '下边', sw: '左下角', w: '左边' };
 for (const [direction, label] of Object.entries(directions)) {
  const handle = document.createElement('button');
  handle.type = 'button'; handle.className = 'image-resize-handle';
  handle.dataset.resize = direction; handle.setAttribute('aria-label', label + '缩放图片');
  handle.title = '拖动缩放；方向键微调，Shift 加大步长';
  overlay.append(handle);
 }
 const dimensions = document.createElement('span');
 dimensions.className = 'image-size-label'; dimensions.setAttribute('aria-live', 'off');
 overlay.append(dimensions); document.body.append(overlay);

 function maxWidth(node) {
  const row = node.closest('.blog-image-row');
  const parent = row || node.parentElement;
  if (!parent) return 48;
  const style = getComputedStyle(parent);
  let available = parent.clientWidth - parseFloat(style.paddingLeft || 0) - parseFloat(style.paddingRight || 0);
  if (row?.classList.contains('blog-image-pair')) {
   const siblings = [...row.querySelectorAll(':scope > [data-type="img"]')].filter(image => image !== node);
   available -= siblings.reduce((width, image) => width + image.getBoundingClientRect().width, 0)
    + (parseFloat(style.columnGap) || 0) * siblings.length;
  }
  return Math.max(48, Math.min(4096, available));
 }
 function boundWidth(node, width) { return Math.round(Math.max(Math.min(48, maxWidth(node)), Math.min(width, maxWidth(node)))); }
 function preview(node, width) {
  node.classList.add('blog-image-sized');
  node.style.setProperty('--image-width', width + 'px');
  refresh();
 }
 function refresh() {
  const node = getSelected(), img = node?.querySelector('img');
  if (!node?.isConnected || !img || isDisabled()) { overlay.hidden = true; return; }
  const box = img.getBoundingClientRect();
  overlay.hidden = box.width < 1 || box.height < 1 || box.bottom < 0 || box.top > innerHeight;
  Object.assign(overlay.style, { left: box.left + 'px', top: box.top + 'px', width: box.width + 'px', height: box.height + 'px' });
  dimensions.textContent = Math.round(box.width) + ' × ' + Math.round(box.height);
  if (observed !== img) { observer.disconnect(); observer.observe(img); observed = img; }
 }
 function schedule() { cancelAnimationFrame(frame); frame = requestAnimationFrame(refresh); }
 const observer = new ResizeObserver(schedule);
 function finish(cancel = false) {
  if (!gesture) return;
  const state = gesture; gesture = null;
  overlay.classList.remove('is-resizing');
  document.body.classList.remove('resizing-blog-image');
  if (cancel || !state.node.isConnected || !state.changed) {
   state.node.classList.toggle('blog-image-sized', state.hadSize);
   if (state.originalStyle) state.node.style.setProperty('--image-width', state.originalStyle);
   else state.node.style.removeProperty('--image-width');
  } else if (state.changed) onCommit(state.node, state.width);
  refresh();
 }
 listen(overlay, 'pointerdown', event => {
  const handle = event.target.closest('[data-resize]');
  const node = getSelected();
  if (!handle || !node || isDisabled() || event.button !== 0) return;
  event.preventDefault(); event.stopPropagation();
  const rect = node.querySelector('img').getBoundingClientRect();
  onStart?.();
  gesture = {
   node, pointerId: event.pointerId, direction: handle.dataset.resize, x: event.clientX, y: event.clientY,
   startWidth: rect.width, ratio: rect.width / rect.height, width: rect.width, changed: false,
   originalStyle: node.style.getPropertyValue('--image-width'), hadSize: node.classList.contains('blog-image-sized'),
   centered: !node.closest('.blog-image-pair'),
  };
  handle.setPointerCapture(event.pointerId);
  overlay.classList.add('is-resizing'); document.body.classList.add('resizing-blog-image');
 });
 listen(document, 'pointermove', event => {
  if (!gesture || event.pointerId !== gesture.pointerId) return;
  event.preventDefault();
  const { node, direction, startWidth, ratio, x, y, centered } = gesture;
  const dx = (event.clientX - x) * (direction.includes('w') ? -1 : 1) * (centered ? 2 : 1);
  const dy = (event.clientY - y) * (direction.includes('n') ? -1 : 1) * ratio;
  const horizontal = /[ew]/.test(direction), vertical = /[ns]/.test(direction);
  const delta = horizontal && vertical ? (Math.abs(dx) >= Math.abs(dy) ? dx : dy) : horizontal ? dx : dy;
  gesture.width = boundWidth(node, startWidth + delta);
  gesture.changed = Math.abs(gesture.width - startWidth) >= 1;
  preview(node, gesture.width);
 }, { passive: false });
 listen(document, 'pointerup', event => { if (gesture?.pointerId === event.pointerId) finish(); });
 listen(document, 'pointercancel', () => finish(true));
 listen(window, 'blur', () => finish(true));
 listen(document, 'keydown', event => {
  if (gesture && event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); finish(true); }
 }, true);
 listen(overlay, 'keydown', event => {
  const node = getSelected();
  if (!node || isDisabled() || !['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(event.key)) return;
  event.preventDefault(); event.stopPropagation();
  const start = node.querySelector('img').getBoundingClientRect().width;
  const step = event.shiftKey ? 50 : 10;
  const value = event.key === 'Home' ? 48 : event.key === 'End' ? maxWidth(node)
   : start + (['ArrowRight','ArrowUp'].includes(event.key) ? step : -step);
  const direction = event.target.dataset.resize;
  onStart?.(); onCommit(node, boundWidth(node, value)); refresh();
  overlay.querySelector('[data-resize="' + direction + '"]')?.focus({ preventScroll: true });
 });
 listen(window, 'scroll', schedule, true);
 listen(window, 'resize', () => { finish(true); schedule(); });
 listen(content, 'load', schedule, true);
 return {
  refresh, isResizing: () => Boolean(gesture), cancel: () => finish(true),
  contains: node => overlay.contains(node),
  destroy() { finish(true); cancelAnimationFrame(frame); observer.disconnect(); listeners.forEach(remove => remove()); overlay.remove(); },
 };
}
