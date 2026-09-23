/* ═══════════ 네모박스 — Figma "두번째 휠 이벤트 모션"(132:340) · "네모박스 모션"(132:339) ═══════════
 *
 * 퇴장 시퀀스가 끝난 다음 휠에 격자 왼쪽 아래 칸에서 나타난다 (없음 → 50×50 → 284×236, ease-in-out).
 * 박스를 잡고 끌면 왼쪽 아래는 고정, 오른쪽 위 모서리가 커서를 따라 커진다 (처음 크기가 최소, 격자 끝이 최대).
 * 놓으면 스프링으로 처음 크기로 돌아간다(한 번 살짝 넘쳤다 복귀).
 *
 * 나머지는 전부 박스 크기 하나에서 계산한다. 놓을 땐 그 순간 모습에서 원래 모습으로 박스와 같은 스프링을 걸어 같이 띠용:
 *   가로선  — 박스 윗변보다 아래일 수 없음. 밀려 올라가다 서로 겹치면 한 줄로 보이고, 격자 위끝에 닿으면 사라짐
 *   세로 겹선 — 같은 식으로 오른변에 밀려감
 *   초록 글 — 아랫변이 박스 윗변 가로선에 닿으면 그 선을 따라 올라가며 아래부터 잘림 (479 → 0),
 *             오른변이 다가오면 왼쪽에서 눌려 좁아지고 다시 조판됨 (133:783)
 *   노트북  — 박스 오른변이 노트북 왼끝을 넘으면 오른쪽 아래 기준으로 작아짐 (폭 = 격자 오른끝 − 박스 오른변)
 * 좌표는 Figma 격자(1800 × 960) 기준. 세로는 무대 높이에 맞춰 늘어나므로 그릴 때 sy 를 곱한다.
 *
 * 등장이 끝나면 한 번 "숨쉰다" — 혼자 살짝 커졌다 스프링으로 돌아온다(--s1boxHint). 끌 수 있다는 걸 알리는 힌트라
 * 놓았을 때와 똑같은 움직임을 쓴다. 0 으로 두면 안 함.
 *
 * 3번째 휠(Figma "3번째 휠" 152:1046, 0.6초): 박스는 왼쪽 아래 기준, 초록 글상자는 오른쪽 위 기준으로 같은 비율로 작아져 사라짐.
 *   글상자 폭이 줄어드는 만큼 글이 다시 조판된다. 휠 올리면 반대로.
 */
import { $, bezier } from '../utils.js';
import { BOX_SHOTS } from '../data.js';

const stage = $('#s1stage'), grid = $('#s1grid'), box = $('#s1box'), laptop = $('#s1laptop');
const vg = [...grid.querySelectorAll('.v')], hr = [...grid.querySelectorAll('.h')], bd = grid.querySelector('.bd'),
      hr2 = [...grid.querySelectorAll('.h2')];

const GW = 1800, GH = 960;                  // Figma 격자
const VX = [284, 586, 888, 1190, 1492];     // 세로 겹선(23px) 왼선
const HY = [237, 480, 724];                 // 가로선
const HY2 = [158, 200, 359, 401, 560, 602, 761, 803];   // 4번째 휠에 새로 그려지는 가로선 8개 = 42px 간격 4쌍 (Figma 167:2093)
const GX0 = 1, GW_LINE = 1798;              // 가로선 왼끝 · 길이 (격자 테두리 안쪽)
const W0 = 284, T0 = 724, POP = 50;         // 박스 기본 = 왼쪽 아래 칸(폭 284, 윗변 724) · 등장 중간 크기 50×50
const LAP_W = 307;                          // 노트북 폭 — 오른끝이 격자 오른끝(1800)
const TEXT_Y = 480;                         // 초록 글상자 아래끝 = 이 가로선 바로 위 (stage1.js seqH, 1080 에선 479)
const TEXT_L = 1273;                        // 초록 글 왼끝(무대 좌표, stage1.js BODY 마지막 프레임)
const TEXT_R = 1860;                        // 초록 글 오른끝 = 격자 오른선
const TALL_W0 = 1492, TALL_W1 = 1569;       // 이 박스 폭 사이에서 글상자가 격자 전체 높이로 늘어남 (Figma 133:783 #20)
let squeeze = () => {};                     // stage1.js 가 넘겨줌 — (왼끝, 높이) 로 본문을 다시 조판

let sy = 1, scale = 1;                      // 세로 배율(무대 높이 / 1080 격자) · 무대 scale(화면 px → 무대 px)
let w = W0, t = T0;                         // 박스 오른변 x · 윗변 y (격자 좌표)
let shown = false, u = 0, uTo = 0;          // u: 등장 진행(이징 전, 0~1)
let v = 0, vTo = 0;                         // v: 3번째 휠 — 박스·초록 글이 사라지는 진행(이징 전, 0~1)
let drag = null, spring = null, raf = 0, lastT = 0;
let ease = null, inMs = 600, damp = 0.7, freq = 12;
let hintT0 = 0, hintMs = 250;               // 등장 직후 한 번 커지는 힌트 (이 뒤에 스프링으로 복귀)
const HINT_W = 30, HINT_T = 26;             // 힌트로 커지는 양(px) — 격자 선 하나가 밀릴 만큼만
let gms = 0, gTo = 0;                       // 마지막 휠 — 가로줄 갈아끼우기 진행(ms). 되감기도 같은 시간축을 거꾸로
let lineEase = null, outMs = 200, gapMs = 200, lnMs = 300;
const lineTotal = () => Math.max(outMs, gapMs + lnMs);

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, k) => a + (b - a) * k;
const css = (n) => getComputedStyle(stage).getPropertyValue(n);

function readVars() {
  const m = /cubic-bezier\(([^)]+)\)/.exec(css('--s1boxEase'));
  ease = m ? bezier(...m[1].split(',').map(Number)) : bezier(0.45, 0, 0.55, 1);
  inMs = (parseFloat(css('--s1boxIn')) || 0.6) * 1000;
  damp = clamp(parseFloat(css('--s1boxDamp')) || 0.7, 0.05, 1);
  freq = parseFloat(css('--s1boxFreq')) || 12;
  const m2 = /cubic-bezier\(([^)]+)\)/.exec(css('--s1lineEase'));
  lineEase = m2 ? bezier(...m2[1].split(',').map(Number)) : bezier(0.45, 0, 0.55, 1);
  outMs = Math.max(1, (parseFloat(css('--s1lineOut')) || 0.2) * 1000);
  gapMs = Math.max(0, (parseFloat(css('--s1lineGap')) || 0.2) * 1000);
  lnMs = Math.max(1, (parseFloat(css('--s1lineIn')) || 0.3) * 1000);
  hintMs = Math.max(0, (parseFloat(css('--s1boxHint')) || 0) * 1000);
}

/* ── 4번째 휠 (Figma 167:2190) — 원래 가로선 3개는 오른끝이 왼쪽으로 빠지며 사라지고(폭 1798 → 0),
 *  --s1lineGap 뒤에 새 가로선 8개가 같은 왼끝에서 오른쪽으로 그려진다(0 → 1798). 휠을 올리면 시간축을 거꾸로 감아 그대로 되돌아간다. */
function paintLines() {
  const e = lineEase || ((x) => x);
  const out = e(clamp(gms / outMs, 0, 1)), inn = e(clamp((gms - gapMs) / lnMs, 0, 1));
  for (const r of hr) r.setAttribute('width', GW_LINE * (1 - out));
  hr2.forEach((r, i) => {
    r.setAttribute('x', GX0);
    r.setAttribute('y', HY2[i] * sy - 1);
    r.setAttribute('width', GW_LINE * inn);
  });
}

/* 박스 크기(ww, tt) → 오른쪽 요소들의 모습. 숫자 배열 하나로 두면 놓을 때 스프링을 똑같이 걸 수 있다
 *  [세로 겹선 x ×5, 가로선 y ×3(무대 px), 글 왼끝, 글 높이, 노트북 배율] */
function derive(ww, tt) {
  // 초록 글 — 두 규칙이 같이 걸림 (Figma 132:339 + 133:783)
  //   옆: 왼끝이 박스 오른변의 겹선 오른선(오른변 + 23)에 밀려 좁아지고 줄을 다시 나눔. 오른끝 1860 고정
  //   높이: 폭이 박스 1492 → 1569 사이에서 479 → 격자 전체로 늘어남(좁아진 글이 노트북 옆까지 내려옴),
  //         아랫변은 박스 윗변의 가로선(밀려 올라간 선)을 넘지 않음 — 선 바로 위에서 잘림
  const baseH = lerp(TEXT_Y * sy - 1, GH * sy, clamp((ww - TALL_W0) / (TALL_W1 - TALL_W0), 0, 1));
  return [
    ...VX.map((x) => Math.max(x, ww)),
    ...HY.map((y) => Math.min(y, tt) * sy),
    Math.min(Math.max(TEXT_L, 60 + ww + 23), 1860),
    Math.min(baseH, tt * sy - 1),
    clamp((GW - ww) / LAP_W, 0, 1),                          // 노트북 — 오른쪽 아래 기준으로 작아짐
  ];
}
function paintGrid(d) {
  VX.forEach((_, i) => {
    const X = d[i];
    vg[i].setAttribute('transform', 'translate(' + X + ' 0)');
    vg[i].style.display = X >= GW - 0.5 ? 'none' : '';
  });
  HY.forEach((_, i) => {
    const Y = d[5 + i];
    hr[i].setAttribute('y', Y - 1);
    hr[i].style.display = Y <= 0.5 ? 'none' : '';
  });
}
function paint(d) {
  paintGrid(d);
  const k = d[10];
  laptop.style.transform = Math.abs(k - 1) > 1e-4 ? 'scale(' + k + ')' : '';   // 튕길 땐 1 을 살짝 넘기도 함
  laptop.style.visibility = k <= 0.001 ? 'hidden' : '';
  squeeze(d[8], d[9]);
}

// 사진 — 격자(1800 × 960·sy) 비율로 눌러 둔 채 박스를 꽉 채움(cover). 박스를 끝까지 키우면 사진이 격자에 딱 맞는다.
// 화면 세로가 짧으면(sy < 1) 사진이 그만큼 세로로 눌리고, 박스가 작을 땐 pos(중심점) 기준으로 잘린다
let shotEl = null, shotPos = [0.5, 0.5];
function placeShot(bw, bh) {
  if (!shotEl) return;
  const Wv = GW, Hv = GH * sy, k = Math.max(bw / Wv, bh / Hv), iw = Wv * k, ih = Hv * k;
  shotEl.style.width = iw + 'px'; shotEl.style.height = ih + 'px';
  shotEl.style.left = (bw - iw) * shotPos[0] + 'px'; shotEl.style.top = (bh - ih) * shotPos[1] + 'px';
}

function render() {
  const a = ease ? ease(u) : u;
  if (a < 1) {                                               // 등장 중: 0 → 50×50 → 기본 칸. 선·글·노트북은 그대로
    const e = a * 2;
    const bw = e <= 1 ? POP * e : lerp(POP, W0, e - 1), bh = e <= 1 ? POP * e : lerp(POP, (GH - T0) * sy, e - 1);
    box.style.width = bw + 'px'; box.style.height = bh + 'px'; placeShot(bw, bh);
    paintGrid(derive(W0, T0));
    return;
  }
  const c = ease ? ease(v) : v;
  if (c > 0) {                                               // 3번째 휠 (Figma 152:1046): 박스는 왼쪽 아래, 초록 글은 오른쪽 위 모서리를 기준으로 비율대로 작아져 사라짐
    const k = 1 - c, bw = W0 * k, bh = (GH - T0) * sy * k;
    box.style.width = bw + 'px'; box.style.height = bh + 'px'; placeShot(bw, bh);
    paintGrid(derive(W0, T0));
    laptop.style.transform = laptop.style.visibility = '';
    const tw = (TEXT_R - TEXT_L) * k;                        // 글상자 폭이 줄어드는 만큼 줄을 다시 나눔(글자 단위)
    squeeze(TEXT_R - tw, (TEXT_Y * sy - 1) * k);
    return;
  }
  box.style.width = w + 'px';
  box.style.height = (GH - t) * sy + 'px';
  placeShot(w, (GH - t) * sy);
  // 놓은 뒤엔 오른쪽 요소들도 박스와 같은 스프링으로 — 놓던 순간의 모습에서 원래 모습으로, 똑같이 살짝 넘쳤다 복귀
  if (spring) { const R = derive(W0, T0); paint(R.map((r, i) => r + (spring.d0[i] - r) * spring.f)); }
  else paint(derive(w, t));
}

// 스프링 (처음 속도 0) — 1 에서 0 으로. damp < 1 이면 0 을 한 번 살짝 지나쳤다 돌아옴
function springAt(ms) {
  const x = ms / 1000, om = freq, z = damp;
  if (z >= 1) return (1 + om * x) * Math.exp(-om * x);
  const od = om * Math.sqrt(1 - z * z);
  return Math.exp(-z * om * x) * (Math.cos(od * x) + (z * om / od) * Math.sin(od * x));
}

function tick(now) {
  const dt = Math.max(0, Math.min(50, now - lastT)); lastT = now;
  let busy = false;
  if (u !== uTo) {                                           // 등장 / 퇴장
    u = uTo > u ? Math.min(uTo, u + dt / inMs) : Math.max(uTo, u - dt / inMs);
    busy = u !== uTo;
    if (u === 0 && uTo === 0) { shown = false; box.classList.remove('on'); laptop.style.transform = laptop.style.visibility = ''; }
    if (u === 1 && uTo === 1 && hintMs > 0 && !drag && !spring) hintT0 = now;   // 다 나왔으면 한 번 숨쉬기
  }
  if (v !== vTo) {                                           // 3번째 휠: 사라짐 / 되돌아옴
    v = vTo > v ? Math.min(vTo, v + dt / inMs) : Math.max(vTo, v - dt / inMs);
    busy = busy || v !== vTo;
    if (v === 0 && vTo === 0) hint(true);                    // 다 돌아오면 DRAG ↗ 다시
  }
  if (gms !== gTo) {                                         // 4번째 휠: 가로줄 갈아끼우기 (되감기는 같은 시간축을 거꾸로)
    gms = gTo > gms ? Math.min(gTo, gms + dt) : Math.max(gTo, gms - dt);
    paintLines();
    busy = busy || gms !== gTo;
  }
  if (hintT0) {                                              // 등장 직후 힌트 — 살짝 커졌다가
    const k = ease ? ease(clamp((now - hintT0) / hintMs, 0, 1)) : 1;
    w = W0 + HINT_W * k; t = T0 - HINT_T * k;
    if (k >= 1) { hintT0 = 0; spring = { t0: now, w: HINT_W, t: -HINT_T, f: 1, d0: derive(w, t) }; }   // 놓았을 때와 같은 스프링으로 복귀
    busy = true;
  }
  if (spring) {                                              // 놓은 뒤 복귀
    const el = now - spring.t0, f = springAt(el);
    w = W0 + spring.w * f; t = T0 + spring.t * f; spring.f = f;
    if (el > 300 && Math.abs(f) < 1e-3) { w = W0; t = T0; spring = null; hint(true); }   // 박스는 조금 움직였어도 글·선은 많이 움직였을 수 있어 배율로 끝냄. 제자리로 돌아오면 DRAG ↗ 다시
    else busy = true;
  }
  if (shown) render();
  raf = busy ? requestAnimationFrame(tick) : 0;
}
function kick() { if (!raf) { lastT = performance.now(); raf = requestAnimationFrame(tick); } }

/* ── 휠에서 부르는 것 (stage1.js) — 걸리는 시간(ms)을 돌려줌, 할 일이 없으면 0 ── */
export const boxShown = () => shown;
const hint = (on) => $('#s1drag').classList.toggle('gone', !on);   // DRAG ↗ (Figma 144:891) 보이기/숨기기
export function boxRefresh() { if (shown) render(); }        // 리사이즈 때 본문(renderBody)이 글상자 높이를 덮어쓴 뒤 다시
export function showBox() {
  if (shown && uTo === 1) return 0;
  readVars(); hint(true);                                     // 다시 나올 때도 DRAG ↗ 보이게
  shown = true; uTo = 1; w = W0; t = T0;
  box.classList.add('on');
  render(); kick();
  return inMs * (1 - u);
}
// 3번째 휠 — 박스·초록 글 사라짐(등장 반대, 0.6초). 휠 올리면 되돌아옴
export const boxCleared = () => vTo === 1;
export function clearBox() {
  if (!shown || u < 1 || vTo === 1 || drag) return 0;
  readVars(); spring = null; hintT0 = 0; w = W0; t = T0; hint(false);
  vTo = 1; kick();
  return inMs * (1 - v);
}
export function unclearBox() {
  if (vTo === 0 || gms > 0) return 0;                        // 4번째 휠(가로줄)이 되감기기 전엔 박스가 안 돌아옴
  vTo = 0; kick();
  return inMs * v;
}

/* ── 4번째 휠에서 부르는 것 (stage1.js) ── */
export const gridMorphed = () => gTo > 0;
export function morphGrid() {
  if (!shown || vTo !== 1 || v < 1 || gTo > 0) return 0;      // 3번째 휠(박스·초록 글 사라짐)이 끝난 뒤에만
  readVars();
  gTo = lineTotal(); kick();
  return gTo - gms;
}
export function unmorphGrid() {
  if (gTo === 0) return 0;
  gTo = 0; kick();
  return gms;
}
export function hideBox() {
  if (!shown || uTo === 0 || drag || vTo !== 0 || v > 0) return 0;
  spring = null; hintT0 = 0; w = W0; t = T0; render();       // 튕기는 중이었으면 제자리로 놓고 들어감
  uTo = 0; kick();
  return inMs * u;
}

export function boxSizing(stageH, s) {                       // stage1.js sizing() — 무대 높이가 바뀌면 격자 세로 좌표를 다시
  if (!(s > 0) || !isFinite(stageH)) return;                 // 창 폭이 0 일 때(숨은 탭 등)
  scale = s;
  const H = Math.max(1, stageH - 120);
  sy = H / GH;
  grid.setAttribute('height', H);
  grid.setAttribute('viewBox', '0 0 ' + GW + ' ' + H);
  bd.setAttribute('height', H - 1);
  for (const g of vg) for (const r of g.children) r.setAttribute('height', H);
  paintLines();                                              // 새 가로선 세로 자리 (4번째 휠)
  if (shown) render();
  else paintGrid(derive(W0, T0));
}

export function initBox(squeezeBody) {
  squeeze = squeezeBody;
  // 프로젝트 사진 하나를 랜덤으로 — 페이지 열 때(새로고침 포함)만 뽑고, 박스를 넣었다 꺼내도 그대로. 박스가 나오기 전에 미리 받아둠
  // 직전에 나온 사진은 빼고 뽑는다 (브라우저에 마지막 사진만 기억 — 저장이 막힌 환경이면 그냥 랜덤)
  if (BOX_SHOTS.length) {
    let last = null;
    try { last = localStorage.getItem('s1lastShot'); } catch (e) {}
    const pool = BOX_SHOTS.length > 1 ? BOX_SHOTS.filter((s) => s.src !== last) : BOX_SHOTS;
    const shot = pool[Math.floor(Math.random() * pool.length)];
    try { localStorage.setItem('s1lastShot', shot.src); } catch (e) {}
    const img = new Image();
    img.src = shot.src; img.alt = ''; img.draggable = false; img.decoding = 'async';
    shotPos = (shot.pos || '50% 50%').split(/\s+/).map((v) => parseFloat(v) / 100);
    box.prepend(img); shotEl = img;
    if (shot.ink) $('#s1drag').style.color = shot.ink;          // 밝은 사진은 DRAG ↗ 를 어둡게
  }
  box.addEventListener('pointerdown', (e) => {
    if (!shown || uTo !== 1 || u < 1 || v > 0 || vTo !== 0 || e.button !== 0) return;   // 3번째 휠로 사라지는 중엔 못 잡음
    e.preventDefault();
    box.setPointerCapture(e.pointerId);
    spring = null; hintT0 = 0;                               // 튕기는 중(또는 힌트 중)에 잡으면 그 자리에서 이어서
    hint(false);                                             // DRAG ↗ 안내 — 잡는 동안은 숨김, 놓고 제자리로 돌아오면 다시
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY, w, t };
    box.classList.add('grab');
  });
  box.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    w = clamp(drag.w + (e.clientX - drag.x) / scale, W0, GW);
    t = clamp(drag.t + (e.clientY - drag.y) / scale / sy, 0, T0);
    render();
  });
  const up = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    drag = null; box.classList.remove('grab');
    if (w !== W0 || t !== T0) { readVars(); spring = { t0: performance.now(), w: w - W0, t: t - T0, f: 1, d0: derive(w, t) }; kick(); }
    else hint(true);                                         // 안 끌고 놓았으면 바로
  };
  box.addEventListener('pointerup', up);
  box.addEventListener('pointercancel', up);
  box.addEventListener('lostpointercapture', up);
}
