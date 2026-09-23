/* ═══════════ ABOUT ME — 5번째 휠 + 클릭 (Figma "5번째 휠" 167:2388 · "클릭 이벤트" 162:1968) ═══════════
 *
 * ① 5번째 휠 — 4번째 휠(격자 가로줄 갈아끼우기)이 끝난 다음 휠에, 격자 왼쪽 아래 바깥에서 90° 누운 채로 들어와
 *    제자리에서 바로 선다. ABOUT 은 격자 왼쪽 첫 칸에 세로로, ME 는 ABOUT 의 T 와 같은 줄에 가로로.
 *
 *    움직임은 "제자리에서 ±90° 돌려놓은 모습"에서 0° 로 돌아오는 회전 하나다 — Figma 첫 프레임(#2)과 끝 프레임(#6)의
 *    좌표를 맞춰보면 두 프레임이 딱 한 점을 중심으로 한 회전으로 이어진다(중심: ABOUT 139.5,1100 — 무대 좌표).
 *    ME 의 중심은 사용자가 찍어준 대로 ME 자신의 왼쪽 아래 모서리(233,1020)이고, ABOUT 과 반대로 돈다 —
 *    아래로 늘어진 채 오른쪽에서 왼쪽으로 쓸어 올라와 T 옆에 눕는다.
 *    그래서 위치와 각도를 따로 굴리지 않고 transform-origin 에 그 점을 주고 각도만 굴린다.
 *
 * ② 클릭 — **글자 하나하나가 따로 버튼이다.** A 를 누르면 A 만 **왼쪽에서 오른쪽으로 지워지고**, 지워지기 시작한
 *    조금 뒤 그 자리에 이력 한 덩이가 **같은 방향으로 그려진다** (4번째 휠 가로줄과 같은 어법). 나머지 글자는 가만히 있는다.
 *    들어온 덩이를 다시 누르면 그 자리만 시간축을 거꾸로 감아 글자로 돌아온다. T 자리에는 사진, ME 는 늘 제목으로 남는다.
 *    그래서 ABOUT 은 그림 한 장이 아니라 **같은 SVG 5장을 글자별 띠(BAND)로 잘라** 겹쳐 둔 것이다 —
 *    회전할 땐 5장이 똑같이 도니까 한 장처럼 보이고, 클릭 땐 한 장씩 따로 지울 수 있다.
 *
 * 세로가 짧은 화면에서는 격자가 눌리는 만큼(sy) 글자도 이력도 통째로 같은 비율로 작아진다 — 글자가 눌리지 않고,
 * ABOUT 은 언제나 격자 위선에서 아래선까지 꽉 찬다. 가로 자리도 같은 비율이라 ABOUT·ME 사이 간격도 그대로.
 */
import { $, bezier } from '../utils.js';
import { CV } from '../data.js';

const stage = $('#s1stage'), about = $('#s1about'), me = $('#s1me'), cv = $('#s1cv');
const glyphs = [...about.querySelectorAll('img')];
const GH = 960;
/* [요소, 격자 기준 x, y, 폭, 높이, 회전중심 x, y(요소 안 좌표), 도는 쪽] — 전부 Figma 1920×1080 격자(1800×960) 좌표. 실제로는 여기에 sy 를 곱한다.
 *  도는 쪽 −1 = 왼쪽에서 오른쪽으로(ABOUT) · +1 = 오른쪽에서 왼쪽으로(ME) — 둘이 서로 반대로 돌며 만난다 */
const ITEMS = [
  [about,   0,   0, 159, 960,  79.5, 1040, -1],   // ABOUT — 격자 왼쪽 끝, 위선부터 아래선까지 (Figma 167:2313)
  [me,    173, 802, 350, 158,   0,   158, +1],    // ME — ABOUT 의 T 와 같은 줄. 왼쪽 아래 모서리를 축으로 돈다 (Figma 167:2320)
];
/* 글자 5개를 자르는 띠 — 960 중 몇 %(위끝, 아래끝). 글자 사이 빈 줄의 가운데에서 잘라 획이 안 잘리게 */
const BAND = [[0, 18.646], [18.646, 39.583], [39.583, 60.521], [60.521, 81.458], [81.458, 100]];
/* 이력 다섯 덩이가 들어갈 자리 — Figma 무대 좌표(1920×1080). 글자 A·B·O·U·T 자리와 같은 줄 */
const CV_AT = [
  [60,  57, 173, 161],   // 김유진 / 연락처 (157:1382)
  [60, 256, 261, 163],   // EDUCATION (157:1401)
  [60, 455, 373, 165],   // ACTIVITIES (157:1390)
  [60, 657, 298, 164],   // SKILLS (157:1442)
  [60, 862, 135, 158],   // 사진 (162:1939)
];

let sy = 1, u = 0, uTo = 0, raf = 0, lastT = 0, ease = null, ms = 400, on = false;
let cvMs = [0, 0, 0, 0, 0], cvTo = [0, 0, 0, 0, 0];          // 자리마다 따로 구르는 진행(ms) — 되감기도 같은 시간축을 거꾸로
let erase = 600, delay = 350, draw = 800;
let blocks = [], measured = false;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const css = (n) => getComputedStyle(stage).getPropertyValue(n);
const secs = (n, d) => Math.max(1, (parseFloat(css(n)) || d) * 1000);
const cvTotal = () => Math.max(erase, delay + draw);         // 한 자리가 다 바뀌는 데 걸리는 시간
const cvAny = () => cvMs.some((v) => v > 0) || cvTo.some((v) => v > 0);

function readVars() {
  const m = /cubic-bezier\(([^)]+)\)/.exec(css('--s1aboutEase'));
  ease = m ? bezier(...m[1].split(',').map(Number)) : bezier(0.5, 0.2, 0.5, 0.8);
  ms = secs('--s1about', 0.4);
  erase = secs('--s1cvErase', 0.6);
  delay = secs('--s1cvDelay', 0.35); draw = secs('--s1cvDraw', 0.8);
}

/* ── 이력 만들기 (data.js CV) — 줄마다 Figma 좌표 그대로. 덩이 안은 1920 기준 px 이고, 덩이째로 sy 배율이 걸린다 ── */
const el = (cls, style, text) => {
  const e = document.createElement(text === undefined ? 'div' : 'p');
  e.className = cls; e.style.cssText = style;
  if (text !== undefined) e.textContent = text;
  return e;
};
function rows(list, y, gap, wa, xb) {              // 왼쪽(연도) · 오른쪽(내용) 두 단
  return list.flatMap(([a, b], i) => [
    el('tx', 'left:0;top:' + (y + i * gap) + 'px;width:' + wa + 'px', a),
    el('tx', 'left:' + xb + 'px;top:' + (y + i * gap) + 'px', b),
  ]);
}
function buildCv() {
  const B = CV_AT.map(() => el('blk', ''));
  B[0].append(
    ...CV.name.map((t, i) => el('hd', 'top:' + i * 33 + 'px', t)),
    ...CV.info.map((t, i) => el('tx', 'left:0;top:' + (96 + i * 23) + 'px', t)),
  );
  B[1].append(el('hd', 'top:0', 'EDUCATION'), ...rows(CV.education, 75, 23, 67, 87));
  B[2].append(el('hd', 'top:0', 'ACTIVITIES'), ...rows(CV.activities, 54, 23, 43, 63));
  B[3].append(el('hd', 'top:0', 'SKILLS'),
    ...CV.skills.map(([t], i) => el('tx', 'left:0;top:' + (30 + i * 23) + 'px;width:92px', t)),
    ...CV.skills.map(([, w], i) => {                                    // 막대 — 흰 바탕에 초록만큼
      const b = el('bar', 'top:' + (36.5 + i * 23) + 'px');
      b.append(el('', 'width:' + w + 'px'));
      return b;
    }));
  const img = new Image(135, 158);
  img.src = CV.photo; img.alt = '김유진'; img.draggable = false;
  B[4].append(img);
  cv.append(...B);
  blocks = B;
}

// 덩이 박스 크기 — 안의 줄이 전부 absolute 라 박스가 0×0 으로 접힌다. clip-path 는 이 박스를 기준으로 자르므로 꼭 잡아줘야 한다.
// Figma 크기를 바닥으로 두고 실제 줄이 더 길면(ACTIVITIES 마지막 줄처럼) 그만큼 넓힌다 — data.js 글을 바꿔도 안 잘리게
function measureCv() {
  if (measured) return;
  measured = true;
  blocks.forEach((b, i) => {
    b.style.clipPath = 'none';
    let w = CV_AT[i][2], h = CV_AT[i][3];
    for (const c of b.children) { w = Math.max(w, c.offsetLeft + c.offsetWidth); h = Math.max(h, c.offsetTop + c.offsetHeight); }
    b.style.width = w + 'px'; b.style.height = h + 'px';
  });
}

function render() {
  const a = 1 - (ease ? ease(u) : u);                        // 1 = 누운 채 바깥 · 0 = 제자리
  for (const [e, x, y, w, h, px, py, dir] of ITEMS) {
    e.style.left = 60 + x * sy + 'px';
    e.style.top = 60 + y * sy + 'px';
    e.style.width = w * sy + 'px';
    e.style.height = h * sy + 'px';
    e.style.transformOrigin = px * sy + 'px ' + py * sy + 'px';
    e.style.transform = a > 1e-4 ? 'rotate(' + dir * 90 * a + 'deg)' : '';
  }
  CV_AT.forEach(([x, y], i) => {
    const b = blocks[i];
    if (!b) return;
    b.style.left = 60 + (x - 60) * sy + 'px';
    b.style.top = 60 + (y - 60) * sy + 'px';
    b.style.transform = sy === 1 ? '' : 'scale(' + sy + ')';
  });
  paintCv();
}
// 글자는 자기 띠만 보이고, 지워지는 만큼 왼쪽에서 잘려 나간다. 이력은 반대로 오른쪽에서 열린다 — clip-path 하나로 둘 다
function paintCv() {
  const e = ease || ((x) => x);
  for (let i = 0; i < BAND.length; i++) {
    const [t0, t1] = BAND[i];
    const p = e(clamp(cvMs[i] / erase, 0, 1));                          // 글자 지워짐
    const q = e(clamp((cvMs[i] - delay) / draw, 0, 1));                 // 이력 그려짐
    glyphs[i].style.clipPath = 'inset(' + t0 + '% 0 ' + (100 - t1) + '% ' + p * 100 + '%)';
    if (blocks[i]) blocks[i].style.clipPath = 'inset(0 ' + (1 - q) * 100 + '% 0 0)';
  }
}

function tick(now) {
  const dt = Math.max(0, Math.min(50, now - lastT)); lastT = now;
  let busy = false;
  if (u !== uTo) {
    u = uTo > u ? Math.min(uTo, u + dt / ms) : Math.max(uTo, u - dt / ms);
    busy = u !== uTo;
    if (u === 0 && uTo === 0) { on = false; about.classList.remove('on'); me.classList.remove('on'); }
  }
  for (let i = 0; i < cvMs.length; i++) {
    if (cvMs[i] === cvTo[i]) continue;
    cvMs[i] = cvTo[i] > cvMs[i] ? Math.min(cvTo[i], cvMs[i] + dt) : Math.max(cvTo[i], cvMs[i] - dt);
    busy = busy || cvMs[i] !== cvTo[i];
  }
  if (!cvAny()) cv.classList.remove('on');
  render();
  raf = busy ? requestAnimationFrame(tick) : 0;
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
  if (!on || uTo === 0 || cvAny()) return 0;                 // 이력이 먼저 닫혀야 들어간다
  readVars();
  uTo = 0; kick();
  return ms * u;
}

/* ── 클릭 — 자리 하나(i)씩. 휠 되감기에서는 인자 없이 불러 열린 걸 전부 닫는다 ── */
export const cvShown = () => cvAny();
export function openCv(i) {
  if (!on || u < 1 || cvTo[i] > 0) return 0;
  readVars();
  cv.classList.add('on');
  measureCv();                                             // 보이게 된 뒤에 재야 한다 (폰트도 다 온 뒤)
  cvTo[i] = cvTotal(); kick();
  return cvTo[i] - cvMs[i];
}
export function closeCv(i) {
  if (i === undefined) {                                   // 열린 자리 전부 (휠 올렸을 때)
    let t = 0;
    cvTo.forEach((_, k) => { t = Math.max(t, closeCv(k)); });
    return t;
  }
  if (cvTo[i] === 0) return 0;
  readVars();
  cvTo[i] = 0; kick();
  return cvMs[i];
}

export function initAbout() {
  buildCv();
  // 글자와 그 자리에 들어오는 덩이가 같은 버튼이다 — 글자를 누르면 덩이로, 덩이를 누르면 글자로.
  // 글자 그림 5장은 완전히 겹쳐 있지만 clip-path 가 누를 수 있는 자리까지 잘라줘서 자기 띠에서만 눌린다 (다 지워지면 안 눌림)
  const toggle = (i) => { if (cvTo[i] > 0) closeCv(i); else openCv(i); };
  const key = (i) => (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(i); } };
  glyphs.forEach((g, i) => { g.addEventListener('click', () => toggle(i)); g.addEventListener('keydown', key(i)); });
  blocks.forEach((b, i) => { b.addEventListener('click', () => toggle(i)); b.addEventListener('keydown', key(i)); b.tabIndex = 0; b.setAttribute('role', 'button'); });
}
