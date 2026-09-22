/* ═══════════ STAGE 1 — 빈 격자 (canvas) ═══════════
 *
 * 글자 없이 단·행 격자만 그린다. 폭이 제각각인 단(컬럼)마다 자기 사다리(행 경계)를 가지며,
 * 단마다 세로 오프셋과 군데군데 문단 여백이 있어 신문 지면의 뼈대처럼 보인다.
 * 화면 2 에서 이 틀에 글자가 부어진다. 격자 색·굵기는 data.js 의 TUNE.gridAlpha / gridWidth.
 */
import { TUNE } from '../data.js';
import { $, cl } from '../utils.js';

const cvs = $('#flowcv'), ctx = cvs.getContext('2d');

let W = 0, H = 0, dpr = 1, padX = 0, padY = 0;
let fs = 0, lh = 0;                    // (글자는 안 그리지만) 행 높이·단 간격의 기준 글자 크기·행간
let paper = '#F3F3F3', hair = '#D6D6D0';
let cols = [];                         // 단: { x0, x1, ys[] }  ys = 행 경계 y (마지막은 맨 아래 선)

// 결정적 의사난수 (단 배치가 매번 같게)
function hash(a, b) {
  let h = (a * 374761393 + b * 668265263 + TUNE.textSeed * 1274126177) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/* ── 크기 / 단 배치 계산 (초기화·리사이즈·폰트 로드 시) ── */
export function sizing() {
  W = window.innerWidth; H = window.innerHeight;
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  cvs.width = Math.floor(W * dpr); cvs.height = Math.floor(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const cs = getComputedStyle(document.documentElement);
  paper = cs.getPropertyValue('--paper').trim() || paper;
  hair = cs.getPropertyValue('--hair').trim() || hair;

  padX = W * TUNE.padX; padY = H * TUNE.padY;
  fs = cl(W * TUNE.smallSize[1], TUNE.smallSize[0], TUNE.smallSize[2]);
  lh = fs * TUNE.smallLine;

  // 단 — 폭 제각각, 단마다 세로 오프셋, 군데군데 문단 여백
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
    const ys = []; let y0 = padY + hash(c, 2) * lh;
    for (let r = 0; ; r++, y0 += lh) {
      if (gaps.has(r)) { if (ys.length) ys.push(y0); y0 += lh * TUNE.smallParaGap; }   // 문단 여백 앞뒤로 선
      if (y0 + lh > H - padY * 0.5) break;
      ys.push(y0);
    }
    if (ys.length) ys.push(ys[ys.length - 1] + lh);
    cols.push({ x0: x, x1: x + cw, ys });
    x += cw + gap;
  }
}

/* ── 그리기: 배경 + 격자 ── */
export function render() {
  ctx.fillStyle = paper; ctx.fillRect(0, 0, W, H);
  if (TUNE.gridAlpha <= 0) return;
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

// 폰트 로드 후 / 리사이즈 후 — 계측을 다시 하고 다시 그림
export function refresh() { sizing(); render(); }

export function initStage1() { refresh(); }
