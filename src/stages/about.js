/* ═══════════ ABOUT ME — 5번째 휠 (Figma "5번째 휠" 167:2388) ═══════════
 *
 * 4번째 휠(격자 가로줄 갈아끼우기)이 끝난 다음 휠에, 격자 왼쪽 아래 바깥에서 90° 누운 채로 들어와
 * 제자리에서 바로 선다 (0.4초). ABOUT 은 격자 왼쪽 첫 칸에 세로로, ME 는 ABOUT 의 T 와 같은 줄에 가로로.
 *
 * 움직임은 "제자리에서 −90° 돌려놓은 모습"에서 0° 로 돌아오는 회전 하나다 — Figma 첫 프레임(#2)과 끝 프레임(#6)의
 * 좌표를 맞춰보면 두 프레임이 딱 한 점을 중심으로 한 회전으로 이어진다(중심: ABOUT 139.5,1100 — 무대 좌표).
 * ME 의 중심은 사용자가 찍어준 대로 ME 자신의 왼쪽 아래 모서리(233,1020)이고, ABOUT 과 반대로 돈다 —
 * 아래로 늘어진 채 오른쪽에서 왼쪽으로 쓸어 올라와 T 옆에 눕는다.
 * 그래서 위치와 각도를 따로 굴리지 않고 transform-origin 에 그 점을 주고 각도만 ±90° → 0° 로 굴린다.
 * (회전 중심이 격자 아래선 밖이라, 도는 동안은 화면 왼쪽 아래 바깥에 있다가 쓸려 올라온다.)
 *
 * 세로가 짧은 화면에서는 격자가 눌리는 만큼(sy) 글자도 통째로 같은 비율로 작아진다 — 글자가 눌리지 않고,
 * ABOUT 은 언제나 격자 위선에서 아래선까지 꽉 찬다. 가로 자리도 같은 비율이라 ABOUT·ME 사이 간격도 그대로.
 */
import { $, bezier } from '../utils.js';

const stage = $('#s1stage'), about = $('#s1about'), me = $('#s1me');
const GH = 960;
/* [요소, 격자 기준 x, y, 폭, 높이, 회전중심 x, y(요소 안 좌표), 도는 쪽] — 전부 Figma 1920×1080 격자(1800×960) 좌표. 실제로는 여기에 sy 를 곱한다.
 *  도는 쪽 −1 = 왼쪽에서 오른쪽으로(ABOUT) · +1 = 오른쪽에서 왼쪽으로(ME) — 둘이 서로 반대로 돌며 만난다 */
const ITEMS = [
  [about,   0,   0, 159, 960,  79.5, 1040, -1],   // ABOUT — 격자 왼쪽 끝, 위선부터 아래선까지 (Figma 167:2313)
  [me,    173, 802, 350, 158,   0,   158, +1],   // ME — ABOUT 의 T 와 같은 줄. 왼쪽 아래 모서리를 축으로 돈다 (Figma 167:2320)
];

let sy = 1, u = 0, uTo = 0, raf = 0, lastT = 0, ease = null, ms = 400, on = false;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const css = (n) => getComputedStyle(stage).getPropertyValue(n);

function readVars() {
  const m = /cubic-bezier\(([^)]+)\)/.exec(css('--s1aboutEase'));
  ease = m ? bezier(...m[1].split(',').map(Number)) : bezier(0.4, 0, 0.2, 1);
  ms = Math.max(1, (parseFloat(css('--s1about')) || 0.4) * 1000);
}

function render() {
  const a = 1 - (ease ? ease(u) : u);                        // 1 = 누운 채 바깥 · 0 = 제자리
  for (const [el, x, y, w, h, px, py, dir] of ITEMS) {
    el.style.left = 60 + x * sy + 'px';
    el.style.top = 60 + y * sy + 'px';
    el.style.width = w * sy + 'px';
    el.style.height = h * sy + 'px';
    el.style.transformOrigin = px * sy + 'px ' + py * sy + 'px';
    el.style.transform = a > 1e-4 ? 'rotate(' + dir * 90 * a + 'deg)' : '';
  }
}

function tick(now) {
  const dt = Math.max(0, Math.min(50, now - lastT)); lastT = now;
  u = uTo > u ? Math.min(uTo, u + dt / ms) : Math.max(uTo, u - dt / ms);
  render();
  if (u === 0 && uTo === 0) { on = false; about.classList.remove('on'); me.classList.remove('on'); }
  raf = u !== uTo ? requestAnimationFrame(tick) : 0;
}
function kick() { if (!raf) { lastT = performance.now(); raf = requestAnimationFrame(tick); } }

export function aboutSizing(stageH) {                        // stage1.js sizing() — 격자가 늘고 줄면 같이
  if (!isFinite(stageH)) return;
  sy = Math.max(1, stageH - 120) / GH;
  if (on) render();
}

/* ── 휠에서 부르는 것 (stage1.js) — 걸리는 시간(ms), 할 일이 없으면 0 ── */
export const aboutShown = () => on;
export function showAbout() {
  if (on && uTo === 1) return 0;
  readVars();
  on = true; uTo = 1;
  about.classList.add('on'); me.classList.add('on');
  render(); kick();
  return ms * (1 - u);
}
export function hideAbout() {
  if (!on || uTo === 0) return 0;
  readVars();
  uTo = 0; kick();
  return ms * u;
}
