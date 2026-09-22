/* ═══════════ STAGE 1 — 꽉 찬 작은 글씨 + 포인터 반응 (canvas) ═══════════
 *
 * 레퍼런스(스위스 타이포 포스터)처럼 큰 글자를 작은 글자가 사방에서 감싸며 채움.
 *  - 큰 글씨: 마우스가 지나간 자리에 BIGS 의 음절이 한 글자씩 순서대로 찍힘.
 *             마우스가 TUNE.stampStep 만큼 움직일 때마다 다음 음절. 한 단어가 끝나야 다음 단어.
 *             새 단어가 시작되거나 마우스가 한참 멈추면 이전 글자들은 줄어들며 사라짐.
 *  - 작은 글씨: 폭이 제각각인 단(컬럼)으로 나누고, 행마다 큰 글자 잉크가 있는 열을 뺀
 *             "빈 구간"만 글자 폭대로 채움 → 큰 글자를 글리프 윤곽 그대로 감싼다.
 *             (큰 글자를 저해상도 마스크 캔버스에 찍어 픽셀 단위로 판정 — 'U' 안쪽, 'e' 곡선 아래까지 파고듦)
 */
import { BIGS, DUMMY, TUNE } from '../data.js';
import { $, cl, fine } from '../utils.js';
import { state } from '../state.js';

const cvs = $('#flowcv'), ctx = cvs.getContext('2d');
const mask = document.createElement('canvas'), mctx = mask.getContext('2d', { willReadFrequently: true });   // 큰 글자 잉크 마스크
let ms = 0.5, mw = 0, mh = 0;          // 마스크 배율 / 크기
const FAMILY = '"Archivo","Gothic A1",sans-serif';
const REF = 100;                       // 큰 글씨 계측 기준 크기(px) — 실제 크기는 선형 스케일

let W = 0, H = 0, dpr = 1, padX = 0, padY = 0, MAXS = 0;
let fs = 0, lh = 0, smallFont = '';    // 작은 글씨 크기·행간·폰트
let ink = '#0A0A0A', paper = '#F3F3F3', main = '#C3DCA8', hair = '#D6D6D0';
let cols = [];                         // 작은 글씨 단: { x0, x1, shift, gaps:Set }
const bigCache = new Map(), smallCache = new Map();

// 화면에 살아 있는 큰 글자: { ch, x, y(중심), max, cur, word, fading }
let live = [];
let wordIdx = 0, sylIdx = 0;           // 다음에 찍을 단어 / 음절
let mx = 0, my = 0, lastX = 0, lastY = 0, hasLast = false, travel = 0;
let lastMoveT = 0, loopOn = false, lastT = 0;

// 결정적 의사난수 (단 배치가 매번 같게)
function hash(a, b) {
  let h = (a * 374761393 + b * 668265263 + TUNE.textSeed * 1274126177) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function measureBig(ch) {
  let g = bigCache.get(ch);
  if (!g) {
    ctx.font = '900 ' + REF + 'px ' + FAMILY;
    const m = ctx.measureText(ch);
    g = { adv: m.width, l: m.actualBoundingBoxLeft, r: m.actualBoundingBoxRight,
          asc: m.actualBoundingBoxAscent, desc: m.actualBoundingBoxDescent };
    bigCache.set(ch, g);
  }
  return g;
}
function smallW(ch) {
  let w = smallCache.get(ch);
  if (w === undefined) { ctx.font = smallFont; w = ctx.measureText(ch).width; smallCache.set(ch, w); }
  return w;
}

/* ── 크기 / 단 배치 계산 (초기화·리사이즈·폰트 로드 시) ── */
export function sizing() {
  W = window.innerWidth; H = window.innerHeight;
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  cvs.width = Math.floor(W * dpr); cvs.height = Math.floor(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ms = TUNE.maskScale; mw = Math.ceil(W * ms); mh = Math.ceil(H * ms);
  mask.width = mw; mask.height = mh;

  const cs = getComputedStyle(document.documentElement);
  ink = cs.getPropertyValue('--ink').trim() || ink;
  paper = cs.getPropertyValue('--paper').trim() || paper;
  main = cs.getPropertyValue('--main').trim() || main;
  hair = cs.getPropertyValue('--hair').trim() || hair;

  padX = W * TUNE.padX; padY = H * TUNE.padY;
  fs = cl(W * TUNE.smallSize[1], TUNE.smallSize[0], TUNE.smallSize[2]);
  lh = fs * TUNE.smallLine;
  smallFont = '400 ' + fs + 'px ' + FAMILY;
  bigCache.clear(); smallCache.clear();
  MAXS = cl(W * TUNE.maxSizeRatio, TUNE.maxSizeMin, TUNE.maxSizeMax);

  // 작은 글씨 단 — 폭 제각각, 단마다 세로 오프셋, 군데군데 빈 행
  const ncol = Math.min(TUNE.smallCols, Math.max(2, Math.floor((W - padX * 2) / 180)));
  const gap = fs * TUNE.smallColGap;
  const weights = []; let sum = 0;
  for (let c = 0; c < ncol; c++) { const w = 1 + (hash(c, 1) * 2 - 1) * TUNE.smallColVary; weights.push(w); sum += w; }
  const avail = W - padX * 2 - gap * (ncol - 1);
  const nrows = Math.ceil((H - padY * 2) / lh) + 1;
  cols = []; let x = padX;
  for (let c = 0; c < ncol; c++) {
    const cw = avail * weights[c] / sum;
    const gaps = new Set();
    for (let r = 4; r < nrows; r++) if (hash(c, 100 + r) < TUNE.smallGapRate) gaps.add(r);   // 이 행 앞에 문단 여백
    // 격자용 행 경계 — 아래 render() 의 행 진행과 같은 규칙 (단마다 세로 오프셋·문단 여백 포함)
    const ys = []; let y0 = padY + hash(c, 2) * lh;
    for (let r = 0; ; r++, y0 += lh) {
      if (gaps.has(r)) { if (ys.length) ys.push(y0); y0 += lh * TUNE.smallParaGap; }   // 문단 여백 앞뒤로 선
      if (y0 + lh > H - padY * 0.5) break;
      ys.push(y0);
    }
    if (ys.length) ys.push(ys[ys.length - 1] + lh);
    cols.push({ x0: x, x1: x + cw, shift: hash(c, 2) * lh, gaps, ys });
    x += cw + gap;
  }
}

/* ── 마우스 이동 → 음절 찍기 ── */
function stamp(now) {
  const word = BIGS[wordIdx];
  while (word[sylIdx] === ' ') sylIdx++;                       // 공백은 건너뜀
  if (sylIdx === 0) for (const g of live) g.fading = true;      // 새 단어 시작 → 이전 단어는 사라짐
  live.push({ ch: word[sylIdx], x: mx, y: my, max: MAXS * (1 - Math.random() * TUNE.sizeVary), cur: 0, word: wordIdx, fading: false });
  if (live.length > TUNE.maxLive) live.shift();
  sylIdx++;
  if (sylIdx >= word.length) { sylIdx = 0; wordIdx = (wordIdx + 1) % BIGS.length; }
  lastMoveT = now;
  if (!loopOn) { loopOn = true; lastT = now; requestAnimationFrame(tick); }
}
function feed() {
  if (state.stage !== 1) return;
  const now = performance.now();
  lastMoveT = now;
  if (!hasLast) { hasLast = true; lastX = mx; lastY = my; stamp(now); return; }
  travel += Math.hypot(mx - lastX, my - lastY); lastX = mx; lastY = my;
  const need = MAXS * TUNE.stampStep * (sylIdx === 0 ? TUNE.wordGap : 1);   // 단어 사이는 더 벌림
  if (travel >= need) { travel = 0; stamp(now); }
}

/* ── 애니메이션 루프 (살아 있는 글자가 있을 때만) ── */
function tick(now) {
  const dt = Math.min(64, now - lastT); lastT = now;
  const idle = TUNE.holdMs > 0 && now - lastMoveT > TUNE.holdMs;
  let anim = false;
  for (const g of live) {
    if (idle) g.fading = true;
    const target = g.fading ? 0 : g.max, d = target - g.cur;
    if (Math.abs(d) > 0.25) { g.cur += d * (1 - Math.exp(-dt / (g.fading ? TUNE.fadeMs : TUNE.growMs))); anim = true; }
    else g.cur = target;
  }
  live = live.filter((g) => !(g.fading && g.cur < 0.5));
  if (anim) render();
  if (live.length) requestAnimationFrame(tick); else { loopOn = false; if (anim) render(); }
}

/* ── 조판: 큰 글씨 위치 + 작은 글씨 조각(runs) 계산. 큰 글씨가 바뀔 때만 호출 ── */
let bigDraw = [];   // 그릴 큰 글자 { ch, x, y, size, hot }  hot = 방금 찍힌 글자 (포인트 컬러)
let runs = [];      // 작은 글씨 조각 { x, cy, text }
export function render() {
  bigDraw = []; runs = [];

  /* 1) 큰 글씨 — 중심 (x, y) 기준으로 잉크를 가운데 맞춤. 마스크에 찍어 윤곽 판정에 씀 */
  const boxes = [];                                              // 잉크 박스 (마스크를 훑을 범위만 좁히는 용도)
  mctx.setTransform(ms, 0, 0, ms, 0, 0); mctx.clearRect(0, 0, W, H);
  mctx.fillStyle = '#000'; mctx.textBaseline = 'alphabetic';
  for (const g of live) {
    if (g.cur < 1) continue;
    const m = measureBig(g.ch), sc = g.cur / REF;
    const ox = g.x - (m.r - m.l) * sc / 2 , base = g.y + (m.asc - m.desc) * sc / 2;
    mctx.font = '900 ' + g.cur + 'px ' + FAMILY;
    mctx.fillText(g.ch, ox, base);
    bigDraw.push({ ch: g.ch, x: ox, y: base, size: g.cur, hot: g === live[live.length - 1] });
    boxes.push({ x0: ox - m.l * sc, x1: ox + m.r * sc, y0: base - m.asc * sc, y1: base + m.desc * sc });
  }
  const md = boxes.length ? mctx.getImageData(0, 0, mw, mh).data : null;

  // 행 [y0,y1] 에서 큰 글자 잉크가 있는 가로 구간들 — 마스크의 그 띠를 열 단위로 훑음
  function inkRuns(y0, y1, cx0, cx1, pad) {
    const runs = [];
    if (!md) return runs;
    const r0 = Math.max(0, Math.floor((y0 - pad) * ms)), r1 = Math.min(mh - 1, Math.ceil((y1 + pad) * ms));   // 위아래로도 pad 만큼 띄움
    for (const b of boxes) {
      if (b.y1 <= y0 || b.y0 >= y1 || b.x1 + pad <= cx0 || b.x0 - pad >= cx1) continue;
      const c0 = Math.max(0, Math.floor(b.x0 * ms)), c1 = Math.min(mw - 1, Math.ceil(b.x1 * ms));
      let start = -1;
      for (let c = c0; c <= c1 + 1; c++) {
        let ink = false;
        if (c <= c1) for (let r = r0; r <= r1; r++) if (md[(r * mw + c) * 4 + 3] > 40) { ink = true; break; }
        if (ink && start < 0) start = c;
        else if (!ink && start >= 0) { runs.push([start / ms - pad, c / ms + pad]); start = -1; }
      }
    }
    runs.sort((a, b) => a[0] - b[0]);
    return runs;
  }

  /* 2) 작은 글씨 — 단마다 행 단위로 빈 구간만 채움 (그리지 않고 조각만 만듦) */
  const pad = fs * TUNE.wrapPad, len = DUMMY.length;
  cols.forEach((col, c) => {
    let off = (c * 997) % len;                                   // 단마다 이어지는 글 위치
    let y0 = padY + col.shift;
    for (let r = 0; ; r++, y0 += lh) {
      if (col.gaps.has(r)) y0 += lh * TUNE.smallParaGap;         // 문단 사이 여백 (행간의 일부)
      const y1 = y0 + lh, cy = y0 + lh / 2;
      if (y1 > H - padY * 0.5) break;
      // 이 행·이 단에서 잉크가 있는 구간 → 빈 구간
      const blocked = inkRuns(y0, y1, col.x0, col.x1, pad);
      const free = []; let x = col.x0;
      for (const [a, b] of blocked) { if (a > x) free.push([x, a]); x = Math.max(x, b); }
      if (x < col.x1) free.push([x, col.x1]);

      for (const [a, b] of free) {
        if (b - a < fs * 2) continue;
        let run = '', px = a;
        for (;;) {
          const ch = DUMMY[off % len];
          if (!run && ch === ' ') { off++; continue; }
          const w = smallW(ch);
          if (px + w > b) break;
          run += ch; px += w; off++;
        }
        if (run) runs.push({ x: a, cy, text: run });
      }
    }
  });
  draw();
}

/* ── 그리기: 큰 글씨 + 작은 글씨 조각 ── */
function draw() {
  ctx.fillStyle = paper; ctx.fillRect(0, 0, W, H);
  // 격자 — 작은 글씨가 갇힌 단·행 틀. 큰 글씨는 이 틀을 무시하고 위에 얹힘
  if (TUNE.gridAlpha > 0) {
    ctx.save(); ctx.globalAlpha = TUNE.gridAlpha; ctx.strokeStyle = hair; ctx.lineWidth = TUNE.gridWidth;
    ctx.beginPath();
    for (const c of cols) {
      if (!c.ys.length) continue;
      const x0 = Math.round(c.x0) + 0.5, x1 = Math.round(c.x1) + 0.5, top = c.ys[0], bot = c.ys[c.ys.length - 1];
      ctx.moveTo(x0, top); ctx.lineTo(x0, bot); ctx.moveTo(x1, top); ctx.lineTo(x1, bot);
      for (const y of c.ys) { const yy = Math.round(y) + 0.5; ctx.moveTo(x0, yy); ctx.lineTo(x1, yy); }
    }
    ctx.stroke(); ctx.restore();
  }
  ctx.fillStyle = ink; ctx.textBaseline = 'alphabetic';
  for (const g of bigDraw) {
    ctx.fillStyle = g.hot ? main : ink;                         // 한 화면에 컬러 하나: 마지막 글자만
    ctx.font = '900 ' + g.size + 'px ' + FAMILY; ctx.fillText(g.ch, g.x, g.y);
  }
  ctx.font = smallFont; ctx.textBaseline = 'middle'; ctx.fillStyle = ink;
  for (const r of runs) ctx.fillText(r.text, r.x, r.cy);
}

/* ── 입력 ── */
function onMove(e) { mx = e.clientX; my = e.clientY; feed(); }

// 포인터 없는 환경(터치) — 리사주 곡선을 따라 스스로 돌아다니며 글자를 찍음
let autoOn = !fine;
function autoTour(ts) {
  if (autoOn && state.stage === 1) {
    const k = (ts || 0) / TUNE.autoTourPeriod;
    mx = (0.5 + 0.42 * Math.cos(k)) * W;
    my = (0.5 + 0.38 * Math.sin(k * 1.31)) * H;
    feed();
  }
  requestAnimationFrame(autoTour);
}
export function startAutoTour() { requestAnimationFrame(autoTour); }

// 폰트 로드 후 / 리사이즈 후 — 계측을 다시 하고 다시 그림
export function refresh() { sizing(); render(); }

export function initStage1() {
  sizing(); render();
  window.addEventListener('pointermove', onMove, { passive: true });
  window.addEventListener('touchstart', (e) => {
    autoOn = false;
    if (e.touches[0]) { mx = e.touches[0].clientX; my = e.touches[0].clientY; feed(); }
  }, { passive: true });
  window.addEventListener('touchmove', (e) => {
    if (e.touches[0]) { mx = e.touches[0].clientX; my = e.touches[0].clientY; feed(); }
  }, { passive: true });
}
