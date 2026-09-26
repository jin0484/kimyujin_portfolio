/* ═══════════ ABOUT ME — 마지막 휠 + 클릭 (Figma "5번째 휠" 167:2388 · "클릭 이벤트" 162:1968) ═══════════
 *
 * ① 마지막 휠 — 격자 가로줄이 갈아끼워지는 것(box.js morphGrid)과 **같은 휠에서** 일어난다.
 *    원래 가로줄이 지워지는 동안 ABOUT ME 가 격자 왼쪽 아래 바깥에서 90° 누운 채로 쓸려 올라와 제자리에 서고,
 *    그 뒤로 새 가로줄이 그려진다 (--s1aboutHold 만큼 기다렸다 돌기 시작). 한 휠에 두 가지가 겹쳐 일어나
 *    "선만 만지작거리는" 빈 구간이 없어진다 — 원래는 4번째·5번째 휠로 나뉘어 있었다.
 *
 *    움직임은 "제자리에서 ±90° 돌려놓은 모습"에서 0° 로 돌아오는 회전 하나다 — Figma 첫 프레임(#2)과 끝 프레임(#6)의
 *    좌표를 맞춰보면 두 프레임이 딱 한 점을 중심으로 한 회전으로 이어진다(중심: ABOUT 139.5,1100 — 무대 좌표).
 *    ME 의 중심은 사용자가 찍어준 대로 ME 자신의 왼쪽 아래 모서리(233,1020)이고, ABOUT 과 반대로 돈다 —
 *    아래로 늘어진 채 오른쪽에서 왼쪽으로 쓸어 올라와 T 옆에 눕는다.
 *    그래서 위치와 각도를 따로 굴리지 않고 transform-origin 에 그 점을 주고 각도만 굴린다.
 *    기다림(hold)과 회전을 한 시간축(am)으로 재서, 휠을 올리면 그대로 거꾸로 감긴다.
 *
 * ② 클릭 — **글자 하나하나가 따로 버튼이다.** A 를 누르면 A 만 왼쪽에서 오른쪽으로 지워지고, 그 자리에 이력 한 덩이가
 *    **워드팝**으로 들어온다 — 단어가 페이드 없이 한 프레임에 통째로, 한 단어씩 톡톡 (--s1popStep 간격).
 *    SKILLS 막대는 이름이 뜬 다음 왼쪽에서 차오르고, 사진만 왼쪽→오른쪽으로 쓸려 들어온다.
 *    나머지 글자는 가만히 있고, 들어온 덩이를 다시 누르면 그 자리만 시간축을 거꾸로 감아 글자로 돌아온다.
 *    그래서 ABOUT 은 그림 한 장이 아니라 **같은 SVG 5장을 글자별 띠(BAND)로 잘라** 겹쳐 둔 것이다 —
 *    회전할 땐 5장이 똑같이 도니까 한 장처럼 보이고, clip-path 가 눌리는 자리까지 잘라줘서 자기 띠에서만 눌린다.
 *
 * ③ 그다음 휠 — 퇴장 (2026-09-26 사용자 요청). 이력이 열려 있으면 먼저 닫히고, 그다음 휠에 ABOUT·E 는 들어온 회전을 거꾸로 돌아
 *    격자 밖으로 나가고 노트북은 오른쪽 아래로 작아지며 사라진다(네모박스에 밀릴 때처럼). 초록 M(stage1.js renderWork)만 남아
 *    그다음 휠에 슬로건의 M 이 되러 달려간다(slogan.js). 퇴장은 들어오는 시간축(am)과 따로 굴러서 M 은 제자리에 있다.
 *
 * 세로가 짧은 화면에서는 격자가 눌리는 만큼(sy) 글자도 이력도 통째로 같은 비율로 작아진다 — 글자가 눌리지 않고,
 * ABOUT 은 언제나 격자 위선에서 아래선까지 꽉 찬다. 가로 자리도 같은 비율이라 ABOUT·ME 사이 간격도 그대로.
 */
import { $, bezier, tempo } from '../utils.js';
import { CV } from '../data.js';

const stage = $('#s1stage'), about = $('#s1about'), me = $('#s1me'), cv = $('#s1cv'), laptop = $('#s1laptop');
const glyphs = [...about.querySelectorAll('img')];
const hintEl = $('#s1scratch');                              // SCRATCH ↙ 안내 — ABOUT 오른쪽 위 (아래 scratchHint)
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
  [60,  57, 173, 161],   // 김유진 / 직함 (157:1382 — 원래 연락처 자리, 개인정보는 뺐다)
  [60, 256, 261, 163],   // EDUCATION (157:1401)
  [60, 455, 373, 165],   // ACTIVITIES (157:1390)
  [60, 657, 298, 164],   // SKILLS (157:1442)
  [60, 862, 135, 158],   // 사진 (162:1939)
];

let sy = 1, raf = 0, lastT = 0, ease = null, on = false;
let am = 0, amTo = 0, hold = 800, rotMs = 1200, u = 0;       // am: 기다림 + 회전을 합친 시간축(ms). u(0~1) 는 여기서 나온다
let xm = 0, xTo = 0;                                         // 퇴장 시간축(ms, 0 ~ rotMs) — ABOUT·E 가 돌아 나가고 노트북이 작아짐
let cvMs = [0, 0, 0, 0, 0], cvTo = [0, 0, 0, 0, 0];          // 자리마다 따로 구르는 진행(ms) — 되감기도 같은 시간축을 거꾸로
let scr = [], pre = [0, 0, 0, 0, 0];                          // 복권 긁기 — 글자마다 막(캔버스)·긁힌 비율 · 긁어서 미리 뜬 이력 단위 수
let erase = 600, delay = 350, popStep = 45, barMs = 350;
const BAR_W = 183;                                           // SKILLS 막대 전체 길이 (Figma 157:1436) — 흰 바탕도 이만큼까지 그려진다
let blocks = [], units = [], measured = false;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const css = (n) => getComputedStyle(stage).getPropertyValue(n);
const secs = (n, d) => Math.max(0, (parseFloat(css(n)) || d) * 1000);
const amTotal = () => hold + rotMs;
const cvTotal = (i) => Math.max(erase, delay + units[i].length * popStep) + barMs;
const cvAny = () => cvMs.some((v) => v > 0) || cvTo.some((v) => v > 0) || scr.some((s) => s.f > 0);   // 긁다 만 글자도 "열림"

function readVars() {
  const m = /cubic-bezier\(([^)]+)\)/.exec(css('--s1aboutEase'));
  ease = m ? bezier(...m[1].split(',').map(Number)) : bezier(0.5, 0.2, 0.5, 0.8);
  rotMs = Math.max(1, secs('--s1about', 0.4));
  hold = secs('--s1aboutHold', 0.8);
  erase = Math.max(1, secs('--s1cvErase', 0.6));
  delay = secs('--s1cvDelay', 0.35);
  popStep = Math.max(1, secs('--s1popStep', 0.045));
  barMs = Math.max(1, secs('--s1popBar', 0.35));
}

/* ── 이력 만들기 (data.js CV) — 줄마다 Figma 좌표 그대로. 덩이 안은 1920 기준 px 이고, 덩이째로 sy 배율이 걸린다.
 *  워드팝으로 하나씩 뜰 단위(단어 또는 줄)는 span 으로 싸서 순서대로 units 에 모아둔다 — 그 순서가 곧 뜨는 순서 */
function build(blk, U, cls, style, text, split) {            // 줄 하나를 덩이에 붙이고 단위를 순서대로 모음
  const p = document.createElement('p');
  p.className = cls; p.style.cssText = style;
  let first = true;
  for (const w of split ? text.split(' ') : [text]) {
    if (!first) p.append(' ');
    first = false;
    const s = document.createElement('span');
    s.textContent = w;
    p.append(s); U.push({ el: s });
  }
  blk.append(p);
}
function buildCv() {
  blocks = CV_AT.map(() => { const d = document.createElement('div'); d.className = 'blk'; return d; });
  units = CV_AT.map(() => []);
  const B = blocks, U = units;

  CV.name.forEach((t, i) => build(B[0], U[0], 'hd', 'top:' + i * 33 + 'px', t, i > 0));   // 김유진 / KIM YU JIN
  CV.info.forEach((t, i) => build(B[0], U[0], 'tx', 'left:0;top:' + (96 + i * 23) + 'px', t));

  const list = (b, u, head, rows, y, wa, xb) => {
    build(b, u, 'hd', 'top:0', head);
    rows.forEach(([a, t], i) => {
      build(b, u, 'tx', 'left:0;top:' + (y + i * 23) + 'px;width:' + wa + 'px', a);       // 연도는 통째로
      build(b, u, 'tx', 'left:' + xb + 'px;top:' + (y + i * 23) + 'px', t, true);         // 내용은 한 단어씩
    });
  };
  list(B[1], U[1], 'EDUCATION', CV.education, 75, 67, 87);
  list(B[2], U[2], 'ACTIVITIES', CV.activities, 54, 43, 63);

  build(B[3], U[3], 'hd', 'top:0', 'SKILLS');
  CV.skills.forEach(([t, w], i) => {
    build(B[3], U[3], 'tx', 'left:0;top:' + (30 + i * 23) + 'px;width:92px', t);
    const bar = document.createElement('div'), fill = document.createElement('div');      // 이름이 뜬 다음 막대가 그려짐
    bar.className = 'bar'; bar.style.top = (36.5 + i * 23) + 'px';
    bar.append(fill); B[3].append(bar);
    U[3].push({ el: fill, bar: w, track: bar });
  });

  const img = new Image(135, 158);                                                        // 사진은 단어가 없으니 왼쪽→오른쪽으로 쓸려 들어옴
  img.src = CV.photo; img.alt = '김유진'; img.draggable = false;
  B[4].append(img); U[4].push({ el: img, wipe: true });
  cv.append(...B);
}
// 덩이 박스 크기 — 안의 줄이 전부 absolute 라 박스가 0×0 으로 접힌다. 누를 수 있는 넓이가 곧 이 박스라 꼭 잡아줘야 한다.
// Figma 크기를 바닥으로 두고 실제 줄이 더 길면(ACTIVITIES 마지막 줄처럼) 그만큼 넓힌다 — data.js 글을 바꿔도 안 잘리게
function measureCv() {
  if (measured) return;
  measured = true;
  blocks.forEach((b, i) => {
    let w = CV_AT[i][2], h = CV_AT[i][3];
    for (const c of b.children) { w = Math.max(w, c.offsetLeft + c.offsetWidth); h = Math.max(h, c.offsetTop + c.offsetHeight); }
    b.style.width = w + 'px'; b.style.height = h + 'px';
  });
}

function render() {
  u = clamp((am - hold) / rotMs, 0, 1);
  const ez = ease || ((v) => v), out = ez(clamp(xm / rotMs, 0, 1));
  const a = Math.max(1 - ez(u), out);                        // 1 = 누운 채 바깥 · 0 = 제자리. 퇴장은 들어온 길을 거꾸로
  laptop.style.scale = out > 0 ? String(1 - out) : '';       // 노트북 — transform 은 box.js·laptopZoom.js 가 쓰므로 따로 도는 scale 로 (오른쪽 아래 기준)
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
  scratchHint();
}
// 글자는 자기 띠만 보이고 지워지는 만큼 왼쪽에서 잘려 나간다. 이력은 워드팝 — 단위마다 제 차례가 되면 그냥 켜진다(페이드 없음)
// 눈에 보이는 글자는 긁는 막(캔버스, 아래 복권 긁기)이다 — 원래 글자 그림은 투명하게 두고 키보드 포커스·Enter 용으로만 남김.
// 긁어서 미리 뜬 단위(pre)는 그대로 보이고, 저절로 마저 벗겨질 땐 그 뒤 단위부터 차례로 이어서 뜬다
function paintCv() {
  const e = ease || ((x) => x);
  for (let i = 0; i < BAND.length; i++) {
    const [t0, t1] = BAND[i];
    const p = e(clamp(cvMs[i] / erase, 0, 1));
    glyphs[i].style.clipPath = 'inset(' + t0 + '% 0 ' + (100 - t1) + '% ' + p * 100 + '%)';
    if (scr[i]) scr[i].cv.style.clipPath = p > 0 ? 'inset(0 0 0 ' + p * 100 + '%)' : '';
    if (blocks[i]) blocks[i].style.pointerEvents = cvTo[i] > 0 ? '' : 'none';   // 긁는 중엔 덩이가 막 위에서 누르기를 가로채지 않게 — 다 열린 뒤에만 눌러서 덮기
    const t = cvMs[i] - delay, P = pre[i];
    units[i].forEach((n, k) => {
      let d = k < P ? Infinity : t - (k - P) * popStep;
      // 막대와 사진은 글자를 덮는 **덩어리**라, 글자가 다 지워지기 전에 걸치면 흰 줄이 글자 위에 얹혀 보인다 —
      // 제 차례가 와도 지우기가 끝날 때까지는 안 그린다 (가는 회색 글씨는 그대로 겹쳐 들어와도 괜찮아서 그냥 둔다)
      if (n.bar !== undefined || n.wipe) d = Math.min(d, cvMs[i] - erase);
      if (n.wipe) { const q = e(clamp(d / barMs, 0, 1)); n.el.style.clipPath = 'inset(0 ' + (1 - q) * 100 + '% 0 0)'; return; }
      // 막대는 흰 바탕(track)과 초록(fill)이 **같이** 왼쪽에서 그려진다 — 흰 바탕만 먼저 떠 있으면 아직 안 지워진 글자 위에 흰 줄이 걸린다
      if (n.bar !== undefined) {
        const q = e(clamp(d / barMs, 0, 1));
        n.track.style.width = q * BAR_W + 'px';
        n.el.style.width = q * n.bar + 'px';
        return;
      }
      n.el.style.visibility = d > 0 ? 'visible' : 'hidden';
    });
  }
}

function tick(now) {
  const dt = Math.max(0, Math.min(50, now - lastT)) * tempo.k; lastT = now;   // tempo: 섹션 이동 중이면 빨리 (utils.js)
  let busy = false;
  if (am !== amTo) {
    am = amTo > am ? Math.min(amTo, am + dt) : Math.max(amTo, am - dt);
    busy = am !== amTo;
    if (am === 0 && amTo === 0) { on = false; about.classList.remove('on'); me.classList.remove('on'); }
  }
  if (xm !== xTo) {
    xm = xTo > xm ? Math.min(xTo, xm + dt) : Math.max(xTo, xm - dt);
    busy = busy || xm !== xTo;
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
  scr.forEach((_, i) => drawCoat(i, cvTo[i] > 0));              // 막 해상도도 새 크기로 (긁다 만 건 처음부터 — 창 크기를 바꿀 때만)
  if (on) render();
}

/* ── 복권 긁기 (2026-09-24 피드백 "클릭하면 보이는 게 아니라 복권 긁는 느낌") ──
 *  글자 A·B·O·U·T 자체가 긁히는 막이다 — 글자 띠마다 같은 모양을 그린 캔버스를 얹고, 누른 채 문지르면 붓 자국만큼 지워진다(destination-out).
 *  이력이 글자보다 넓어서(오른쪽으로 삐져나감) 밑에 깔아 둘 수 없어서, 대신 **지워진 잉크 비율만큼 이력 단위가 앞에서부터 하나씩** 뜬다.
 *  SCR_DONE 만큼 긁으면 나머지 글자는 원래의 지우기 연출(왼쪽 → 오른쪽)로 저절로 벗겨지고 남은 단위·막대·사진이 이어서 뜬다.
 *  다 나온 이력을 누르면 글자가 온전히 다시 그려지며 원래 되돌리기 연출로 덮인다. 휠을 올리면 긁다 만 것도 전부 처음으로.
 *  막대·사진은 글자를 덮는 덩어리라 긁는 동안엔 안 뜬다(다 벗겨진 뒤에) */
const SCR_DONE = 0.5, BRUSH = 0.2;                           // 이만큼(잉크 비율) 긁으면 저절로 · 붓 굵기 = 글자 띠 폭 × 이만큼
function drawCoat(i, gone) {                                 // 막을 지금 크기로 다시 그림 — gone 이면 비워 둠(이미 다 벗겨진 자리)
  const s = scr[i], im = glyphs[i];
  if (!s || !im.complete || !im.naturalWidth) return;
  const k = (innerWidth / 1920) * Math.min(devicePixelRatio || 1, 2);   // 무대 px → 캔버스 픽셀
  const [t0, t1] = BAND[i], W = Math.max(1, Math.round(159 * sy * k)), FH = GH * sy * k;
  s.cv.width = W; s.cv.height = Math.max(1, Math.round(FH * (t1 - t0) / 100));
  s.g.globalCompositeOperation = 'source-over';
  s.g.clearRect(0, 0, s.cv.width, s.cv.height);
  if (!gone) s.g.drawImage(im, 0, -FH * t0 / 100, W, FH);
  s.ink0 = gone ? 0 : ink(i) || 1; s.f = 0; s.mt = 0;
  if (!gone) pre[i] = 0;
}
function ink(i) {                                            // 막에 남은 잉크 픽셀 수 (3칸마다 하나씩만 셈 — 비율만 보면 되니까)
  const { cv: c, g } = scr[i], d = g.getImageData(0, 0, c.width, c.height).data;
  let n = 0;
  for (let o = 3; o < d.length; o += 12) if (d[o] > 128) n++;
  return n;
}
function scratch(i, x0, y0, x1, y1) {                        // 화면 좌표의 선분만큼 붓으로 지움
  const s = scr[i], r = s.cv.getBoundingClientRect(), kx = s.cv.width / r.width, ky = s.cv.height / r.height;
  s.g.globalCompositeOperation = 'destination-out';
  s.g.lineCap = s.g.lineJoin = 'round'; s.g.lineWidth = BRUSH * s.cv.width;
  s.g.beginPath(); s.g.moveTo((x0 - r.left) * kx, (y0 - r.top) * ky); s.g.lineTo((x1 - r.left) * kx + 0.01, (y1 - r.top) * ky); s.g.stroke();
  const now = performance.now();
  if (now - s.mt > 60) { s.mt = now; measure(i); }            // 잉크 세기는 자주 할 필요 없음
}
function measure(i) {                                        // 긁힌 비율 → 미리 뜰 단위 수. SCR_DONE 을 넘으면 나머지는 저절로
  const s = scr[i];
  if (cvTo[i] > 0) return;
  s.f = clamp(1 - ink(i) / s.ink0, 0, 1);
  const r = clamp(s.f / SCR_DONE, 0, 1);
  if (s.f > 0) { cv.classList.add('on'); measureCv(); }
  pre[i] = Math.min(units[i].length, Math.round(r * units[i].length));
  if (r >= 1) openCv(i);                                     // 마저 벗겨짐 — 지우기 연출은 지금 남은 막에 걸림
  else paintCv();
  scratchHint();
}
function scratchHint() {                                     // SCRATCH ↙ — ABOUT 이 다 들어와 있고 아무 이력도 안 열렸을 때만
  if (!hintEl) return;
  const show = on && u >= 1 && xm === 0 && xTo === 0 && !cvAny();
  hintEl.classList.toggle('on', show);
  if (show) { hintEl.style.left = 60 + (159 + 24) * sy + 'px'; hintEl.style.top = 60 + 20 * sy + 'px'; }
}

/* ── 휠에서 부르는 것 (stage1.js) — 걸리는 시간(ms), 할 일이 없으면 0 ── */
export const aboutShown = () => on;
export const aboutPhase = () => ({ am, total: amTotal() });   // 들어오는 시간축(기다림 + 회전) — WORK 의 W 가 여기 맞춰 ME 의 M 으로 돌아옴 (stage1.js renderWork)
export function showAbout() {
  readVars();
  if (on && amTo === amTotal()) return 0;
  on = true; amTo = amTotal();
  about.classList.add('on'); me.classList.add('on');
  render(); kick();
  return amTo - am;
}
export function hideAbout() {
  if (!on || amTo === 0 || cvAny() || xTo > 0) return 0;     // 이력이 먼저 닫히고, 퇴장했으면 먼저 돌아와야 들어간다
  readVars();
  amTo = 0; kick();
  return am;
}
// 그다음 휠 — ABOUT·E 가 돌아 나가고 노트북이 작아짐. 초록 M 은 남는다
export const aboutOut = () => xTo > 0;
export const aboutOutProgress = () => clamp(xm / Math.max(1, rotMs), 0, 1);   // 아래 여백 막대(stage1.js paintScroll)가 쓰는 진행도
export function exitAbout() {
  if (!on || u < 1 || cvAny() || xTo > 0) return 0;
  readVars();
  xTo = rotMs; kick();
  return xTo - xm;
}
export function unexitAbout() {
  if (xTo === 0) return 0;
  readVars();
  xTo = 0; kick();
  return xm;
}

/* ── 클릭 — 자리 하나(i)씩. 휠 되감기에서는 인자 없이 불러 열린 걸 전부 닫는다 ── */
export const cvShown = () => cvAny();
export function openCv(i) {
  if (!on || u < 1 || xTo > 0 || cvTo[i] > 0) return 0;
  readVars();
  cv.classList.add('on');
  measureCv();                                             // 보이게 된 뒤에 재야 한다 (폰트도 다 온 뒤)
  cvTo[i] = cvTotal(i); kick();
  return cvTo[i] - cvMs[i];
}
export function closeCv(i) {
  if (i === undefined) {                                   // 열린 자리 전부 (휠 올렸을 때)
    let t = 0;
    cvTo.forEach((_, k) => { t = Math.max(t, closeCv(k)); });
    return t;
  }
  if (cvTo[i] === 0) {                                     // 긁다 만 자리 — 막을 새로 씌우고 미리 뜬 단위도 거둠
    if (!scr[i] || scr[i].f === 0) return 0;
    drawCoat(i, false); paintCv(); scratchHint();
    return 1;
  }
  readVars();
  drawCoat(i, false);                                      // 막을 온전히 다시 그림 — 되돌리기 연출(오른쪽 → 왼쪽)로 다시 덮인다
  cvTo[i] = 0; kick();
  return cvMs[i];
}

export function initAbout() {
  buildCv();
  // 글자는 긁어서 열고(아래 막), 다 열린 덩이는 눌러서 다시 덮는다. 키보드로는 글자에서 Enter/Space 로 한 번에 열고 닫음.
  // 글자 그림 5장은 완전히 겹쳐 있지만 clip-path 가 자기 띠까지만 잘라줘서 포커스 테두리도 제 글자에만 걸린다
  const toggle = (i) => { if (cvTo[i] > 0) closeCv(i); else openCv(i); };
  const key = (i) => (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(i); } };
  glyphs.forEach((g, i) => g.addEventListener('keydown', key(i)));
  blocks.forEach((b, i) => { b.addEventListener('click', () => toggle(i)); b.addEventListener('keydown', key(i)); b.tabIndex = 0; b.setAttribute('role', 'button'); });
  // 긁는 막 — 글자 띠마다 캔버스 하나. 누른 채 문지르면 지나간 자리가 지워짐 (포인터를 잡아 둬서 띠 밖으로 나가도 이어짐 — 그림은 제 띠 안만)
  scr = glyphs.map((im, i) => {
    const c = document.createElement('canvas'), [t0, t1] = BAND[i];
    c.className = 'scr'; c.style.top = t0 + '%'; c.style.height = (t1 - t0) + '%';
    about.append(c);
    const s = { cv: c, g: c.getContext('2d', { willReadFrequently: true }), ink0: 1, f: 0, mt: 0, drag: null };
    c.addEventListener('pointerdown', (e) => {
      if (!on || u < 1 || xTo > 0 || cvTo[i] > 0 || e.button !== 0) return;
      e.preventDefault();
      c.setPointerCapture(e.pointerId);
      s.drag = { id: e.pointerId, x: e.clientX, y: e.clientY };
      scratch(i, e.clientX, e.clientY, e.clientX, e.clientY);
    });
    c.addEventListener('pointermove', (e) => {
      const d = s.drag;
      if (!d || e.pointerId !== d.id || cvTo[i] > 0) return;
      scratch(i, d.x, d.y, e.clientX, e.clientY);
      d.x = e.clientX; d.y = e.clientY;
    });
    const up = (e) => { if (!s.drag || e.pointerId !== s.drag.id) return; s.drag = null; if (cvTo[i] === 0) measure(i); };
    c.addEventListener('pointerup', up); c.addEventListener('pointercancel', up); c.addEventListener('lostpointercapture', up);
    return s;
  });
  Promise.all(glyphs.map((im) => (im.decode ? im.decode() : Promise.resolve()).catch(() => {})))
    .then(() => scr.forEach((_, i) => drawCoat(i, cvTo[i] > 0)));
}
