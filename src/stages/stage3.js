/* ═══════════ STAGE 3 — 먼지 파티클 + 타이핑 ═══════════ */
import { SLOGAN, T, TUNE } from '../data.js';
import { getLayout } from './stage2.js';
import { $, cl, smooth } from '../utils.js';
import { state } from '../state.js';

const cvs = $('#dust'), ctx = cvs.getContext('2d');
let parts = null, dpr = 1, builtWith = -1;

// 화면 2의 조판 결과(getLayout)를 그대로 오프스크린 캔버스에 그림 → 픽셀 샘플링용.
// 같은 좌표·같은 글자라 DOM 텍스트와 파티클이 일치하고, 파낸 원 자리는 애초에 글자가 없다.
function drawReplica(w, h) {
  const off = document.createElement('canvas'); off.width = w; off.height = h;
  const c = off.getContext('2d');
  c.fillStyle = '#fff'; c.fillRect(0, 0, w, h);
  c.fillStyle = '#000';
  const L = getLayout();
  c.font = L.font; c.textBaseline = 'middle';
  const hasLS = 'letterSpacing' in c;
  for (const s of L.segs) {
    if (hasLS) { c.letterSpacing = s.sp + 'px'; c.fillText(s.text, s.x, s.y + L.lh / 2); }
    else { let x = s.x; for (const ch of s.text) { c.fillText(ch, x, s.y + L.lh / 2); x += c.measureText(ch).width + s.sp; } }
  }
  return off;
}

function buildParts() {
  const w = Math.floor(cvs.clientWidth), h = Math.floor(cvs.clientHeight);   // 레이어 크기 (스크롤바 제외)
  const off = drawReplica(w, h);
  const data = off.getContext('2d').getImageData(0, 0, w, h).data;
  const step = w * h > 1600000 ? 3 : 2;
  const cx = w / 2, cy = h / 2;
  // 1) 잉크 픽셀 후보를 전부 모은 뒤 2) 상한을 넘으면 화면 전체에서 고르게 솎아냄 (위에서 자르지 않음)
  const cand = [];
  for (let y = 0; y < h; y += step) {
    for (let x = 0; x < w; x += step) {
      if (data[(y * w + x) * 4] > 150) continue;        // 흰 픽셀 skip (파낸 원 자리는 조판에서 이미 비어 있음)
      cand.push(x, y);
    }
  }
  const keep = Math.min(1, TUNE.maxParts / (cand.length / 2)), arr = [];
  for (let i = 0; i < cand.length; i += 2) {
    if (keep < 1 && Math.random() > keep) continue;
    const x = cand[i], y = cand[i + 1];
    const dx = x - cx, dy = y - cy, L = Math.hypot(dx, dy) || 1;
    // 컬 필드: 중심 기준 회전 + 우상단 흐름 → 레퍼런스의 아치형 궤적
    const ux = (-dy / L) * 0.85 + 0.55, uy = (dx / L) * 0.85 - 0.62;
    const m = Math.hypot(ux, uy) || 1;
    arr.push({ x, y, ux: ux / m, uy: uy / m, s: 0.35 + Math.random() * 1.7, d: Math.random(), j: Math.random() * 2 - 1 });
  }
  parts = arr; builtWith = state.punched;
}

export function resetParts() { parts = null; builtWith = -1; }

export function sizeCanvas() {
  dpr = Math.min(window.devicePixelRatio || 1, TUNE.dprCap);
  cvs.width = Math.floor(cvs.clientWidth * dpr);
  cvs.height = Math.floor(cvs.clientHeight * dpr);
}

function drawDust(q) {
  if (!parts) return;
  const w = cvs.width, h = cvs.height;
  ctx.clearRect(0, 0, w, h);
  const S = Math.max(cvs.clientWidth, cvs.clientHeight) * TUNE.dustTravel;
  const disp = Math.pow(q, 1.5) * S;
  const buckets = [[], [], [], [], []];
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    // 입자마다 다른 시점(0~0.3)에 사라지기 시작해 완만하게(smoothstep) 투명해짐
    const a = 1 - smooth(cl((q - 0.3 * p.d) / 0.7, 0, 1));
    if (a <= 0.02) continue;
    const k = disp * p.s;
    const px = (p.x + p.ux * k + p.j * k * 0.18) * dpr;
    const py = (p.y + p.uy * k + p.j * k * 0.11 - k * 0.10) * dpr;
    if (px < -20 || py < -20 || px > w + 20 || py > h + 20) continue;
    buckets[Math.min(4, Math.floor(a * 5))].push(px, py);
  }
  const sz = Math.max(1, 1.35 * dpr);
  for (let b = 4; b >= 0; b--) {
    const arr = buckets[b]; if (!arr.length) continue;
    ctx.fillStyle = 'rgba(10,10,10,' + ((b + 1) / 5 * 0.92).toFixed(2) + ')';
    for (let j = 0; j < arr.length; j += 2) ctx.fillRect(arr[j], arr[j + 1], sz, sz);
  }
}

/* 타이핑 — 위로 스크롤하면 리셋 */
const typed = $('#typed');
let typeStart = null, typeOn = false;
function typing(p) {
  const go = p > T.typing;
  if (go && !typeOn) { typeOn = true; typeStart = performance.now(); }
  if (!go && typeOn) { typeOn = false; typed.textContent = ''; }
  if (typeOn) {
    const n = Math.floor((performance.now() - typeStart) / TUNE.typeSpeed);
    typed.textContent = SLOGAN.slice(0, Math.min(n, SLOGAN.length));
  }
}

/* 먼지 진행도는 스크롤을 바로 따르지 않고 시간으로 부드럽게 따라감 (휠을 휙 돌려도 천천히 흩어짐) */
let qTarget = 0, qCur = 0, loopOn = false, lastT = 0;
function loop(now) {
  const dt = Math.min(64, now - lastT); lastT = now;
  qCur += (qTarget - qCur) * (1 - Math.exp(-dt / TUNE.dustSmoothMs));
  if (Math.abs(qTarget - qCur) < 0.0005) { qCur = qTarget; loopOn = false; }
  drawDust(qCur);
  if (loopOn) requestAnimationFrame(loop);
}

// 매 프레임 호출. p = 전체 진행도, o3 = 화면 3 불투명도
export function updateStage3(p, o3) {
  // 화면 2 끝나기 직전에 파티클 생성. 구멍 수가 바뀌었으면 다시 생성
  if (p > T.s2End - 0.06 && (!parts || builtWith !== state.punched)) buildParts();
  qTarget = cl((p - T.dissolve) / (T.dissolveEnd - T.dissolve), 0, 1);
  if (o3 > 0.01) {
    if (!loopOn) { loopOn = true; lastT = performance.now(); requestAnimationFrame(loop); }
  } else { qCur = qTarget; }                                   // 화면 3이 안 보일 땐 바로 맞춤
  typing(p);
}

export function initStage3() {
  sizeCanvas();
}
