/* ══════════ 커서 (styles/cursor.css) ══════════
 *
 * 점은 포인터 자리에 그대로 찍고, 원은 매 프레임 그 자리로 조금씩 다가간다 — 그 지연이 "부드러움"으로 보인다.
 * 다가가는 비율은 프레임 수가 아니라 **시간**으로 계산한다(1 − (1−k)^(dt/16.7)) — 안 그러면 모니터 주사율에 따라 빠르기가 달라진다.
 * 원은 포인터가 멈추면 rAF 를 끄고, 다시 움직이면 켠다.
 *
 * 누를 수 있는 것(HOT) 위에서는 원이 커지고 점은 숨는다 — 노트북·ABOUT 글자·이력 덩이·네모박스·호버되는 단어.
 * 어두운 것(DARK) 위에서는 색이 초록으로 바뀐다 — 바뀌는 건 CSS transition 이라 툭 튀지 않고 --cursorFade 동안 서서히.
 *   노트북은 몸통이 흰색이라 통째로는 못 넣고, 화면(검은 부분)만 덮는 빈 칸(.screen)을 두고 그걸 잡는다.
 *   글자 그림은 네모 영역이 기준이라 획 사이 빈 곳에서도 초록이 되는데, 그게 덜 어색하다.
 * 동작 줄이기(prefers-reduced-motion)를 켠 사람에겐 지연 없이 딱 붙게 한다.
 */
const HOT = 'a, button, [role="button"], #s1box, #s1name img, #s1body .ts.hv span, #work';   // + 유리 링 위(glass.js 가 html.glasshot 을 켬)
const DARK = '#s1box, #s1name img, #s1about img, #s1cv img, #s1laptop .screen, #work';

export function initCursor() {
  if (!matchMedia('(pointer: fine)').matches) return;           // 터치·펜만 있는 기기면 안 켬
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const el = document.createElement('div');
  el.id = 'cursor';
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML = '<i class="ring"></i><i class="dot"></i>';
  document.body.append(el);
  document.documentElement.classList.add('hascursor');          // 기본 커서 숨기기 — JS 가 살아 있을 때만
  const ring = el.querySelector('.ring'), dot = el.querySelector('.dot');

  const ease = Math.min(1, Math.max(0.02, parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--cursorEase')) || 0.18));
  const put = (e, x, y) => { e.style.transform = 'translate(' + x + 'px, ' + y + 'px)'; };

  let tx = 0, ty = 0, rx = 0, ry = 0, raf = 0, last = 0, first = true;
  function tick(now) {
    const dt = Math.min(64, now - last); last = now;
    const k = calm ? 1 : 1 - Math.pow(1 - ease, dt / 16.667);    // 프레임이 아니라 시간 기준
    rx += (tx - rx) * k; ry += (ty - ry) * k;
    put(ring, rx, ry);
    raf = Math.abs(tx - rx) > 0.1 || Math.abs(ty - ry) > 0.1 ? requestAnimationFrame(tick) : 0;
  }

  window.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse' && e.pointerType !== 'pen') return;
    tx = e.clientX; ty = e.clientY;
    put(dot, tx, ty);                                           // 점은 지연 없이
    if (first) { first = false; rx = tx; ry = ty; put(ring, rx, ry); el.classList.add('in'); }
    const t = e.target.closest ? e.target : null;
    el.classList.toggle('hot', !!(t && t.closest(HOT)) || document.documentElement.classList.contains('glasshot'));
    el.classList.toggle('dark', !!(t && t.closest(DARK)));
    if (!raf) { last = performance.now(); raf = requestAnimationFrame(tick); }
  }, { passive: true });

  window.addEventListener('pointerdown', () => el.classList.add('down'), { passive: true });
  window.addEventListener('pointerup', () => el.classList.remove('down'), { passive: true });
  document.addEventListener('pointerleave', () => el.classList.remove('in'));
  document.addEventListener('pointerenter', () => { if (!first) el.classList.add('in'); });
  window.addEventListener('blur', () => el.classList.remove('in'));
}
