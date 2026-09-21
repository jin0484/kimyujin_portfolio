/* ═══════════ STAGE 2 — 다단 지면 + 원형 구멍 파내기 ═══════════
 *
 * 본문은 CSS 다단이 아니라 직접 조판한다 (pretextjs.dev "Editorial Engine" 과 같은 방식):
 *   단(컬럼)마다 → 행마다 → 파인 원과 그 행이 겹치는 가로 구간(현)을 빼고 →
 *   남은 빈 구간에 글자 폭만큼 텍스트를 잘라 넣는다.  줄 조각 하나 = <div class="ln"> 하나.
 * 그래서 원을 파면 글자가 진짜로 밀려나 원을 둥글게 감싼다. 화면 3은 이 조판 결과를 그대로 캔버스에 그려 파티클로 만든다.
 */
import { DUMMY, PROJ, HOLE_SIZES, SHAPES, TUNE } from '../data.js';
import { $, cl } from '../utils.js';
import { state } from '../state.js';
import { openProject, isModalOpen } from '../modal.js';
import { setNudge } from '../chrome.js';

const s2 = $('#s2'), colsEl = $('#s2cols'), holesEl = $('#holes');
const FAMILY = '"Archivo","Gothic A1",sans-serif';
let holeNodes = [];

/* ── 글자 폭 계측 (canvas, 캐시) ── */
const mctx = document.createElement('canvas').getContext('2d');
const wcache = new Map();
let font = '';
function cw(ch) {
  let w = wcache.get(ch);
  if (w === undefined) { mctx.font = font; w = mctx.measureText(ch).width; wcache.set(ch, w); }
  return w;
}

/* ── 조판 결과 (화면 3도 이걸 씀) ── */
const L = { W: 0, H: 0, fs: 0, lh: 0, font: '', nrows: 0, segs: [] };   // segs: { x, y, w, text, sp }
export function getLayout() { return L; }

// 행 [y0,y1] 과 원의 교차 → 막힌 가로 구간 (원과 띠의 현 + 여백)
function circleBlock(c, y0, y1, pad) {
  const top = y0 - pad * 0.3, bot = y1 + pad * 0.3;
  if (top >= c.y + c.r || bot <= c.y - c.r) return null;
  const a = c.y >= top && c.y <= bot ? 0 : (c.y < top ? top - c.y : c.y - bot);
  if (a >= c.r) return null;
  const half = Math.sqrt(c.r * c.r - a * a);
  return [c.x - half - pad, c.x + half + pad];
}
// [x0,x1] 에서 막힌 구간들을 빼서 빈 구간 목록
function subtract(x0, x1, blocked, minW) {
  let free = [[x0, x1]];
  for (const [bl, br] of blocked) {
    const next = [];
    for (const [fl, fr] of free) {
      if (br <= fl || bl >= fr) { next.push([fl, fr]); continue; }
      if (bl > fl) next.push([fl, bl]);
      if (br < fr) next.push([br, fr]);
    }
    free = next;
  }
  return free.filter(([a, b]) => b - a >= minW);
}

let stream = '';
export function layoutText() {
  const W = s2.clientWidth, H = s2.clientHeight;
  const fs = cl(W * 0.0072, 8.5, 11), lh = fs * TUNE.s2Line;
  font = '400 ' + fs + 'px ' + FAMILY;
  if (L.font !== font) wcache.clear();
  const padX = W * 0.044, padY = H * 0.04;
  const ncol = W <= 820 ? 2 : TUNE.s2Cols, gap = W * TUNE.s2ColGap;
  const colW = (W - padX * 2 - gap * (ncol - 1)) / ncol;
  const nrows = Math.floor((H - padY * 2) / lh);
  const unit = Math.min(W, H);
  const circles = state.holes.map((h) => ({ x: W * h.x / 100, y: H * h.y / 100, r: unit * (h.rCur ?? h.r) / 100 }));
  const pad = fs * TUNE.s2WrapPad, len = stream.length;

  const segs = []; let off = 0;
  for (let c = 0; c < ncol && off < len; c++) {
    const x0 = padX + c * (colW + gap), x1 = x0 + colW;
    for (let r = 0; r < nrows && off < len; r++) {
      const y0 = padY + r * lh, y1 = y0 + lh;
      const blocked = [];
      for (const ci of circles) { const b = circleBlock(ci, y0, y1, pad); if (b) blocked.push(b); }
      blocked.sort((a, b) => a[0] - b[0]);
      for (const [a, b] of subtract(x0, x1, blocked, fs * 2)) {
        // 이 구간에 들어가는 만큼 자름
        let run = '', runW = 0, broke = false;
        while (off < len) {
          const ch = stream[off];
          if (!run && ch === ' ') { off++; continue; }
          const w = cw(ch);
          if (runW + w > b - a) { broke = true; break; }
          run += ch; runW += w; off++;
        }
        if (run.endsWith(' ')) { run = run.slice(0, -1); runW -= cw(' '); }
        if (!run) continue;
        // 양끝맞춤: 남는 폭을 글자 사이에 배분 (너무 벌어지면 왼쪽 정렬)
        let sp = 0;
        if (broke && run.length > 1) { sp = (b - a - runW) / run.length; if (sp > fs * 0.5) sp = 0; }
        segs.push({ x: a, y: y0, w: b - a, text: run, sp });
      }
    }
  }
  Object.assign(L, { W, H, fs, lh, font, nrows, segs });
  renderDom();
}

/* DOM 조각 풀 — 조판 결과만큼 div 를 재사용 */
const pool = [];
function renderDom() {
  colsEl.style.font = L.font; colsEl.style.lineHeight = L.lh + 'px';
  while (pool.length < L.segs.length) {
    const d = document.createElement('div'); d.className = 'ln';
    colsEl.appendChild(d); pool.push(d);
  }
  for (let i = 0; i < pool.length; i++) {
    const d = pool[i];
    if (i >= L.segs.length) { d.style.display = 'none'; continue; }
    const s = L.segs[i];
    d.textContent = s.text;
    d.style.left = s.x + 'px'; d.style.top = s.y + 'px';
    d.style.letterSpacing = s.sp ? s.sp + 'px' : '0';
    d.style.display = '';
  }
}

/* ── 구멍 ── */
// 구멍 하나를 DOM 에 만듦. animate=false 면 (리사이즈 복원) 즉시 열린 상태
function makeHole(h, i, animate) {
  const p = PROJ[i], unit = Math.min(s2.clientWidth, s2.clientHeight), r = unit * h.r / 100;
  const d = document.createElement('div');
  d.className = 'hole';
  d.style.width = d.style.height = (r * 2) + 'px';
  d.style.left = 'calc(' + h.x + '% - ' + r + 'px)';
  d.style.top  = 'calc(' + h.y + '% - ' + r + 'px)';
  d.innerHTML =
    '<button class="objbtn" aria-label="' + p.t + ' 자세히 보기">' +
    '<svg viewBox="0 0 68 68" width="' + Math.round(r * 0.55) + '" height="' + Math.round(r * 0.55) + '">' + SHAPES[p.o] + '</svg>' +
    '<span class="nm">' + p.t + '</span><span class="go">VIEW PROJECT →</span></button>';
  d.querySelector('button').addEventListener('click', (ev) => { ev.stopPropagation(); openProject(p); });
  holesEl.appendChild(d); holeNodes.push(d);
  if (animate) {
    d.offsetWidth;                                               // 초기 상태(scale .2, 투명) 반영 후 전환
    d.style.transition = 'transform .52s cubic-bezier(.16,1.1,.3,1), opacity .3s';
  } else d.style.transition = 'none';
  d.style.transform = 'scale(1)'; d.style.opacity = '1';
}

// 리사이즈 시 — 지금까지 파낸 구멍을 % 좌표로 다시 그리고 본문도 재조판
export function buildHoles() {
  holesEl.innerHTML = ''; holeNodes = [];
  state.holes.forEach((h, i) => makeHole(h, i, false));
  layoutText();
}

// 클릭한 자리에 구멍. 원이 커지는 동안 매 프레임 재조판해서 글자가 밀려나게
function punch(cx, cy) {
  if (state.stage !== 2 || state.punched >= HOLE_SIZES.length) return;
  // % 는 #holes 기준 (스크롤바 폭 때문에 innerWidth 와 다를 수 있음)
  const h = { x: cx / holesEl.clientWidth * 100, y: cy / holesEl.clientHeight * 100, r: HOLE_SIZES[state.punched], rCur: 0 };
  state.holes.push(h);
  makeHole(h, state.punched, true);
  state.punched++;
  setNudge();
  const t0 = performance.now(), dur = 520;
  (function grow(now) {
    const t = Math.min(1, (now - t0) / dur);
    h.rCur = h.r * (1 - Math.pow(1 - t, 3));                     // ease-out
    if (t >= 1) delete h.rCur;
    layoutText();
    if (t < 1) requestAnimationFrame(grow);
  })(t0);
}

// 화면 2 진입 시 본문이 위에서 아래로 한 줄씩 드러남 (한 번만)
// 줄을 실제로 쪼개는 대신, 행 수만큼의 계단(steps)으로 clip-path 를 내린다
let revealed = false;
export function revealCols() {
  if (revealed) return; revealed = true;
  colsEl.style.transition = 'clip-path ' + TUNE.revealMs + 'ms steps(' + Math.max(1, L.nrows) + ', end)';
  colsEl.style.clipPath = 'inset(0 0 0 0)';
}

export function initStage2() {
  stream = DUMMY.repeat(TUNE.colsRepeat);
  layoutText();
  window.addEventListener('click', (e) => {
    if (state.stage === 2 && !isModalOpen() && !e.target.closest('.objbtn')) punch(e.clientX, e.clientY);
  });
}
