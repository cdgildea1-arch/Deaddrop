// A drag may scroll a real inner panel, but should never pull the viewport
// away from the game. Keep horizontal hands, pinch zoom and card gestures.
let previous = null;
const scrollStyle = /^(auto|scroll|overlay)$/;

function canScroll(path, axis, delta) {
  if (!delta) return false;
  for (const node of path) {
    if (node === document.body || node === document.documentElement) break;
    if (!(node instanceof Element)) continue;
    const style = getComputedStyle(node);
    if (!scrollStyle.test(axis === 'y' ? style.overflowY : style.overflowX)) continue;
    const size = axis === 'y' ? node.scrollHeight - node.clientHeight : node.scrollWidth - node.clientWidth;
    if (size <= 2) continue;
    const actual = axis === 'y' ? node.scrollTop : node.scrollLeft;
    // Browsers report negative horizontal positions for RTL scroll containers.
    const offset = axis === 'x' && style.direction === 'rtl' ? size + actual : actual;
    if (delta > 0 ? offset > 1 : offset < size - 1) return true;
  }
  return false;
}

function remember(event) {
  const touch = event.touches.length === 1 ? event.touches[0] : null;
  previous = touch ? { id: touch.identifier, x: touch.clientX, y: touch.clientY } : null;
}

document.addEventListener('touchstart', remember, { passive: true });
document.addEventListener('touchend', remember, { passive: true });
document.addEventListener('touchcancel', () => { previous = null; }, { passive: true });
document.addEventListener('touchmove', event => {
  if (event.touches.length !== 1 || (window.visualViewport?.scale ?? 1) > 1.01) {
    previous = null;
    return;
  }
  const touch = event.touches[0];
  const last = previous;
  remember(event);
  if (!last || last.id !== touch.identifier || !event.cancelable) return;
  const x = touch.clientX - last.x;
  const y = touch.clientY - last.y;
  const axis = Math.abs(y) >= Math.abs(x) ? 'y' : 'x';
  const delta = axis === 'y' ? y : x;
  if (delta && !canScroll(event.composedPath(), axis, delta)) event.preventDefault();
}, { passive: false });
