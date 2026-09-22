/* ═══════════ STAGE 1 — 격자 지면 (레퍼런스: WeWork "FrameWork", 가로 버전) ═══════════
 *
 * 6단 × 4행 격자(캔버스 #flowcv) 위에 요소(DOM, #s1els)를 셀 단위로 놓는다.
 * 어떤 요소를 어느 셀에 둘지는 data.js 의 S1.states — 휠을 내릴 때마다 다음 상태로.
 *  - 라벨(head/date/addr/count/logo)·이미지·밑줄: 셀로 이동할 땐 CSS transition 으로 미끄러짐, 사라질 땐 즉시
 *  - 본문(body/big/tiny): 셀 폭에 맞춰 줄을 잘라 붓는다(pour). 상태가 바뀌면 즉시 다시 조판 (레퍼런스처럼 스냅)
 *  - head 는 처음 나타날 때만 한 글자씩 타이핑
 */
import { DUMMY, S1, TUNE, T } from '../data.js';
import { $, cl } from '../utils.js';

const cvs = $('#flowcv'), ctx = cvs.getContext('2d');
const root = $('#s1els');
const FAMILY = '"Archivo","Gothic A1",sans-serif';

let W = 0, H = 0, dpr = 1;
let paper = '#F3F3F3', hair = '#D6D6D0';
let G = { x0: 0, y0: 0, cw: 0, rh: 0, gut: 0 };   // 격자 기하: 원점, 셀 폭/높이, 단 간격

/* ── 격자 기하 ── */
function cellRect([c, r, cs = 1, rs = 1]) {          // 셀 좌표 → px 사각형 (단 간격은 안쪽에 안 들어감)
  const x = G.x0 + (c - 1) * (G.cw + G.gut), y = G.y0 + (r - 1) * G.rh;
  return { x, y, w: cs * G.cw + (cs - 1) * G.gut, h: rs * G.rh };
}
function rectsOf(v) { return Array.isArray(v[0]) ? v.map(cellRect) : [cellRect(v)]; }

export function sizing() {
  W = window.innerWidth; H = window.innerHeight;
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  cvs.width = Math.floor(W * dpr); cvs.height = Math.floor(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const cs = getComputedStyle(document.documentElement);
  paper = cs.getPropertyValue('--paper').trim() || paper;
  hair = cs.getPropertyValue('--hair').trim() || hair;

  const mx = W * S1.marginX, my = H * S1.marginY, gut = W * S1.gutter;
  G = { x0: mx, y0: my, gut,
        cw: (W - mx * 2 - gut * (S1.cols - 1)) / S1.cols,
        rh: (H - my * 2) / S1.rows };
}

/* ── 격자 그리기: 바깥 테두리 + 단 경계(간격 양쪽) + 행 선 ── */
export function render() {
  ctx.fillStyle = paper; ctx.fillRect(0, 0, W, H);
  if (TUNE.gridAlpha <= 0) return;
  const px = (v) => Math.round(v) + 0.5;
  const x0 = G.x0, x1 = G.x0 + S1.cols * G.cw + (S1.cols - 1) * G.gut, y0 = G.y0, y1 = G.y0 + S1.rows * G.rh;
  ctx.save(); ctx.globalAlpha = TUNE.gridAlpha; ctx.strokeStyle = hair; ctx.lineWidth = TUNE.gridWidth;
  ctx.beginPath();
  ctx.rect(px(x0), px(y0), Math.round(x1 - x0), Math.round(y1 - y0));
  for (let c = 1; c < S1.cols; c++) {
    const gx = G.x0 + c * G.cw + (c - 1) * G.gut;               // 단 간격 왼쪽 끝
    ctx.moveTo(px(gx), y0); ctx.lineTo(px(gx), y1);
    ctx.moveTo(px(gx + G.gut), y0); ctx.lineTo(px(gx + G.gut), y1);
  }
  for (let r = 1; r < S1.rows; r++) { const y = px(G.y0 + r * G.rh); ctx.moveTo(x0, y); ctx.lineTo(x1, y); }
  ctx.stroke(); ctx.restore();
}

/* ── 본문 붓기: 사각형 목록에 순서대로 줄을 채움 (단어 단위, 안 들어가면 글자 단위) ──
 *  align 0 = 왼끝 맞춤, 1 = 오른끝 맞춤, 그 사이 값은 두 정렬의 중간 (본문이 흘러가는 동안 정렬이 서서히 바뀜) */
const mctx = document.createElement("canvas").getContext("2d");
const wcache = new Map(); let wfont = "";
function chw(ch) { let w = wcache.get(ch); if (w === undefined) { w = mctx.measureText(ch).width; wcache.set(ch, w); } return w; }
function pour(text, rects, fs, lh, align = 0) {
  const font = "400 " + fs + "px " + FAMILY;
  if (font !== wfont) { wfont = font; mctx.font = font; wcache.clear(); }
  const lines = []; let i = 0; const n = text.length;
  for (const R of rects) {
    const rows = Math.floor(R.h / lh), maxW = R.w - fs * 0.7;        // 좌우 패딩(.35em) 만큼 빼고 잼
    for (let r = 0; r < rows && i < n; r++) {
      while (text[i] === " ") i++;
      let j = i, lastSp = -1, w = 0;
      while (j < n) {
        const cw = chw(text[j]);
        if (w + cw > maxW) break;
        if (text[j] === " ") lastSp = j;
        w += cw; j++;
      }
      if (j < n && lastSp > i && text[j] !== " ") j = lastSp;   // 단어 중간이면 마지막 공백에서 자름
      if (j === i) j = i + 1;
      const t = text.slice(i, j).trimEnd();
      let tw = 0; for (const ch of t) tw += chw(ch);
      lines.push({ x: R.x + (maxW - tw) * align, y: R.y + r * lh, text: t });
      i = j;
    }
    if (i >= n) break;
  }
  return lines;
}

/* ── 요소 DOM ── */
const els = new Map();           // key → element
const pool = [];                 // 본문 줄 div 풀
function el(key) {
  let e = els.get(key);
  if (e) return e;
  e = document.createElement("div");
  e.className = "s1e s1-" + key.replace(/\d+$/, "");
  e.dataset.key = key;
  root.appendChild(e); els.set(key, e);
  return e;
}
function place(e, R, animate) {
  e.style.transition = animate ? "left " + S1.moveMs + "ms cubic-bezier(.2,.8,.2,1), top " + S1.moveMs + "ms cubic-bezier(.2,.8,.2,1), width " + S1.moveMs + "ms, height " + S1.moveMs + "ms" : "none";
  e.style.left = R.x + "px"; e.style.top = R.y + "px"; e.style.width = R.w + "px"; e.style.height = R.h + "px";
}
let typeTimer = 0;
function typeIn(e, text) {                                    // head 첫 등장 — 한 글자씩
  clearTimeout(typeTimer);
  let k = 0; e.textContent = "";
  (function step() {
    e.textContent = text.slice(0, ++k);
    if (k < text.length) typeTimer = setTimeout(step, S1.typeMs);
  })();
}
function renderLines(lines) {
  while (pool.length < lines.length) { const d = document.createElement("div"); d.className = "s1ln"; root.appendChild(d); pool.push(d); }
  pool.forEach((d, i) => {
    if (i >= lines.length) { d.style.display = "none"; return; }
    const L = lines[i];
    d.textContent = L.text; d.className = "s1ln s1-" + L.key;
    d.style.cssText = "display:block;left:" + L.x + "px;top:" + L.y + "px;font-size:" + L.fs + "px;line-height:" + L.lh + "px";
  });
}

// 본문 스트림 — DUMMY 한 번 + 문장 순서를 뒤집은 것 한 번 (두 단에 걸칠 때 똑같은 글이 반복돼 보이지 않게)
const STREAM = DUMMY + DUMMY.trim().split(". ").reverse().join(". ") + " ";
const POUR = ["body", "big", "tiny"];
const fsOf = (k) => { const [f, l] = S1.font[k] || S1.font.body; const fs = f < 1 ? H * f : f; return [fs, fs * l]; };

// 상태의 본문들을 조판. over 가 있으면 body 만 그 사각형·정렬로 (흐르는 중)
function pourState(st, over) {
  const lines = [];
  for (const key of POUR) {
    if (!st[key]) continue;
    const [fs, lh] = fsOf(key);
    const rects = key === "body" && over ? [over.R] : rectsOf(st[key]);
    const align = key === "body" && over ? over.align : (st[key + "Align"] || 0);
    for (const ln of pour(STREAM, rects, fs, lh, align)) lines.push({ ...ln, fs, lh, key });
  }
  return lines;
}

/* ── 본문 흐름: 상태에 bodyPath 가 있으면, 이전 상태의 body 자리에서 출발해 경로의 셀들을 거쳐 새 자리까지
 *  폭·위치·정렬을 매 프레임 보간하며 다시 조판한다 (뚝뚝 끊기지 않고 문단 모양이 변하면서 이동).
 *  경로 항목 = [단, 행, 단수, 행수, 정렬(0 왼쪽 / 1 오른쪽)] */
let flow = null;      // { st, keys:[{R, align}], t0, dur }
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);   // easeInOutCubic
function keyOf(cell) { return { R: cellRect(cell), align: cell[4] || 0 }; }
function startFlow(st, keys) {
  flow = { st, keys, t0: performance.now(), dur: S1.flowMs * (keys.length - 1) };
  requestAnimationFrame(flowFrame);
}
function flowFrame(now) {
  if (!flow) return;
  const u = Math.min(1, (now - flow.t0) / flow.dur);
  const segs = flow.keys.length - 1, s = Math.min(segs - 1, Math.floor(u * segs)), t = ease(u * segs - s);
  const a = flow.keys[s], b = flow.keys[s + 1];
  const R = { x: a.R.x + (b.R.x - a.R.x) * t, y: a.R.y + (b.R.y - a.R.y) * t, w: a.R.w + (b.R.w - a.R.w) * t, h: a.R.h + (b.R.h - a.R.h) * t };
  renderLines(pourState(flow.st, { R, align: a.align + (b.align - a.align) * t }));
  if (u < 1) requestAnimationFrame(flowFrame); else flow = null;
}

/* ── 상태 적용 ── */
let cur = -1, shown = new Set();
function apply(idx) {
  const st = S1.states[idx], prev = S1.states[cur];
  const next = new Set(Object.keys(st).filter((k) => !POUR.includes(k) && !k.endsWith("Path") && !k.endsWith("Align")));

  // 1) 본문 — 기본은 즉시 재조판(스냅). 앞으로 넘어가며 bodyPath 가 있으면 흐르고, 뒤로 돌아올 땐 그 경로를 거꾸로
  flow = null;
  let keys = null;
  if (prev && st.bodyPath && cur === idx - 1 && prev.body && st.body) {
    keys = [keyOf([...prev.body, prev.bodyAlign || 0]), ...st.bodyPath.map(keyOf), keyOf([...st.body, st.bodyAlign || 0])];
  } else if (prev && prev.bodyPath && cur === idx + 1 && prev.body && st.body) {
    keys = [keyOf([...prev.body, prev.bodyAlign || 0]), ...prev.bodyPath.map(keyOf).reverse(), keyOf([...st.body, st.bodyAlign || 0])];
  }
  if (keys) startFlow(st, keys); else renderLines(pourState(st));

  // 2) 라벨·이미지·밑줄 — 있던 건 미끄러져 이동, 새로 오는 건 그 자리에 등장, 빠지는 건 즉시 숨김
  for (const key of next) {
    const e = el(key), R = rectsOf(st[key])[0], was = shown.has(key);
    if (S1.text[key] !== undefined) {
      const [fs, lh] = fsOf(key);
      e.style.fontSize = fs + "px"; e.style.lineHeight = lh + "px";
      if (key === "head" && !was) typeIn(e, S1.text[key]); else e.textContent = S1.text[key];
    }
    e.style.display = "block";
    place(e, R, was);
  }
  for (const key of shown) if (!next.has(key)) els.get(key).style.display = "none";
  shown = next;
  // 서명은 항상 오른쪽 아래
  const logo = el("logo"); const [lf, ll] = fsOf("logo");
  logo.textContent = S1.text.logo; logo.style.display = "block"; logo.style.fontSize = lf + "px"; logo.style.lineHeight = ll + "px";
  const last = cellRect([S1.cols, S1.rows]); place(logo, { x: last.x, y: last.y + last.h + 4, w: last.w, h: ll }, false);   // 격자 아래 여백에
  cur = idx;
}

// 매 프레임 — 진행도 p(0~1) 로 상태 결정. 화면 1 구간(0~T.s1End)을 states 수로 균등 분할
export function updateStage1(p) {
  const n = S1.states.length;
  const idx = cl(Math.floor(p / (T.s1End / n)), 0, n - 1);
  if (idx !== cur) apply(idx);
}

// 폰트 로드 후 / 리사이즈 후 — 계측을 다시 하고 다시 그림·조판
export function refresh() { sizing(); render(); if (cur >= 0) { const i = cur; cur = -1; shown = new Set(); apply(i); } }

export function initStage1() { sizing(); render(); apply(0); }

