/* ══════════ 노트북 클릭 → 노트북이 화면 가득 커지며 WORK 로 (2026-09-24 피드백) ══════════
 *
 * 누르면 노트북 화면(검은 부분)의 가운데가 화면 가운데로 오면서, 검은 화면이 격자를 다 덮을 만큼 커진다.
 * 그동안 격자 바깥 여백도 같이 어두워지고(#s1 배경), 유리 링·SCROLL DOWN 은 비켜준다(stage1.css html.lapzoom).
 * 다 커지면 work.html 로 넘어간다 — 그쪽도 같은 검정이라 이음매가 없고, 커진 CLICK 은 이름(view-transition-name lapclick)이 붙어 있어
 * 넘어간 뒤 그 자리에서 .6초 동안 사라진다 — 뚝 끊기지 않게 (View Transitions — 안 되는 브라우저는 그냥 넘어감).
 *
 * 노트북은 box.js 가 줄여 놨을 수도 있어서(transform-origin 100% 100% 의 scale) 그 위에 덧붙인다.
 * 뒤로 가기로 돌아오면(bfcache) 원래 크기로 되돌려 둔다.
 * --lapZoom: 커지는 시간 · --lapZoomEase: 이징 (stage1.css #s1)
 */
import { $ } from './utils.js';

const DW = 1920, PAD = 60;                  // 무대 폭 · 격자 바깥 여백(무대 좌표)
const DARK = 0.74;                          // .screen 은 검은 화면에서 사방 13% 안쪽 — 검은 부분 = .screen / 0.74

export function initLaptopZoom() {
  const lap = $('#s1laptop'), stage = $('#s1stage'), screen = lap.querySelector('.screen'), root = document.documentElement;
  let anim = null;
  lap.addEventListener('click', (e) => {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;   // 새 탭으로 열기 등은 그대로
    e.preventDefault();
    if (anim) return;
    const go = () => location.assign(lap.href);
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { go(); return; }

    const st = stage.getBoundingClientRect(), k = st.width / DW;   // 무대 배율
    const r = screen.getBoundingClientRect();
    // 무대 좌표로: 지금 화면 가운데(c) · 옮겨 갈 자리 = 뷰포트 가운데(t) · 노트북 transform 기준점(O, 오른쪽 아래)
    const c = [(r.left + r.width / 2 - st.left) / k, (r.top + r.height / 2 - st.top) / k];
    const t = [(innerWidth / 2 - st.left) / k, (innerHeight / 2 - st.top) / k];
    const O = [lap.offsetLeft + lap.offsetWidth, lap.offsetTop + lap.offsetHeight];
    // 검은 화면이 격자 안쪽(뷰포트 − 사방 여백)을 다 덮는 배율. 화면이 기울고 모서리가 둥글어 넉넉히 — 1.12 로는 모서리에 흰 틈이 남았다
    const gw = innerWidth - 2 * PAD * k, gh = innerHeight - 2 * PAD * k;
    const S = Math.max(gw / (r.width / DARK), gh / (r.height / DARK)) * 1.35;
    // 기준점 O 에서 translate(T) scale(S) 를 기존 transform 앞에 붙이면: 새 자리 = O + T + S·(c − O) → 이게 t 가 되게
    const T = [t[0] - O[0] - S * (c[0] - O[0]), t[1] - O[1] - S * (c[1] - O[1])];
    const base = lap.style.transform || '';
    const cs = getComputedStyle($('#s1'));
    const dur = (parseFloat(cs.getPropertyValue('--lapZoom')) || 0.9) * 1000;
    const ease = cs.getPropertyValue('--lapZoomEase').trim() || 'cubic-bezier(.65, 0, .35, 1)';
    root.classList.add('lapzoom');
    anim = lap.animate([{ transform: base || 'none' }, { transform: 'translate(' + T[0] + 'px,' + T[1] + 'px) scale(' + S + ') ' + base }],
                       { duration: dur, easing: ease, fill: 'forwards' });
    anim.finished.then(go, () => {});
  });
  addEventListener('pageshow', (e) => {                        // 뒤로 가기로 돌아왔을 때 — 커진 채로 멈춰 있지 않게
    if (!e.persisted || !anim) return;
    anim.cancel(); anim = null;
    root.classList.remove('lapzoom');
  });
}
