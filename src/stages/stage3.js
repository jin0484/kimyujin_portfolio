/* ═══════════ STAGE 3 — 먼지 파티클 + 타이핑 ═══════════ */
import { SLOGAN, T, TUNE } from '../data.js';
import { getLayout, drawGrid } from './stage2.js';
import { $, cl, smooth } from '../utils.js';
import { state } from '../state.js';

const cvs = $('#dust'), ctx = cvs.getContext('2d');
let parts = null, dpr = 1, builtWith = -1;
let gridA = 0;    // 격자 농도 — 화면 2 가 사라지며 넘겨받고(1), 타이핑 진행에 따라 0 으로

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
  const w = cvs.width, h = cvs.height;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, w, h);
  // 격자 — 글자는 날아가도 틀은 남는다. 마지막 문장이 적히며 함께 비워짐
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); drawGrid(ctx, gridA); ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (!parts) return;
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

/* 타이핑 — 스크롤 단계(T.typing 부터 T.typeStep 간격)마다 한 동작씩.
 *  0: a 타이핑  1: b 타이핑(다른 폰트)  2: b 지우기  3: c 타이핑
 *  내려갈 땐 지금 단계 동작이 다 끝나야 다음 단계로 넘어감 (휠을 빨리 내려도 건너뛰지 않음).
 *  올라갈 땐 바로 그 단계로 가서 이전 단계들의 최종 상태를 놓고 해당 동작만 다시 재생 */
const t1 = $('#t1'), t2 = $('#t2'), t3 = $('#t3'), t4 = $('#t4');
let step = -1, want = -1, stepStart = 0;
function enter(s, now) {
  step = s; stepStart = now;
  t1.textContent = s >= 1 ? SLOGAN.a : '';
  t2.textContent = s === 2 ? SLOGAN.b : '';
  t3.textContent = t4.textContent = '';
}
function setStep(p, now) {
  want = p < T.typing ? -1 : Math.min(3, Math.floor((p - T.typing) / T.typeStep));
  if (want < step) enter(want, now);                       // 위로: 즉시
}
// 현재 단계의 동작을 시간에 맞춰 진행. 아직 할 일이 남아 있으면 true
function typing(now) {
  if (step < 0) { t1.textContent = t2.textContent = t3.textContent = t4.textContent = ''; }
  let busy = false;
  const n = Math.floor((now - stepStart) / TUNE.typeSpeed);
  if (step === 0) { t1.textContent = SLOGAN.a.slice(0, n); busy = n < SLOGAN.a.length; }
  else if (step === 1) { t2.textContent = SLOGAN.b.slice(0, n); busy = n < SLOGAN.b.length; }
  else if (step === 2) {
    const k = Math.floor((now - stepStart - TUNE.holdBeforeErase) / TUNE.eraseSpeed);   // hold 동안은 k<0 → 그대로
    t2.textContent = SLOGAN.b.slice(0, Math.max(0, SLOGAN.b.length - k)); busy = k < SLOGAN.b.length;
  }
  else if (step === 3) {                                   // c(볼드) 다 치고 이어서 d
    t3.textContent = SLOGAN.c.slice(0, n); t4.textContent = SLOGAN.d.slice(0, Math.max(0, n - SLOGAN.c.length));
    busy = n < SLOGAN.c.length + SLOGAN.d.length;
  }
  if (!busy && want > step) { enter(step + 1, now); return true; }   // 아래로: 끝난 뒤에만 한 단계씩
  return busy;
}

/* 먼지 진행도는 스크롤을 바로 따르지 않고 시간으로 부드럽게 따라감 (휠을 휙 돌려도 천천히 흩어짐)
 * 같은 루프에서 타이핑도 진행 — 먼지가 멈추고 타이핑도 끝나면 루프 정지 */
let qTarget = 0, qCur = 0, loopOn = false, lastT = 0;
function loop(now) {
  const dt = Math.min(64, now - lastT); lastT = now;
  qCur += (qTarget - qCur) * (1 - Math.exp(-dt / TUNE.dustSmoothMs));
  if (Math.abs(qTarget - qCur) < 0.0005) qCur = qTarget;
  drawDust(qCur);
  const busy = typing(now);
  loopOn = qCur !== qTarget || busy;
  if (loopOn) requestAnimationFrame(loop);
}
function wake() {
  if (!loopOn) { loopOn = true; lastT = performance.now(); requestAnimationFrame(loop); }
}

// 매 프레임 호출. p = 전체 진행도, o3 = 화면 3 불투명도
export function updateStage3(p, o3) {
  // 화면 2 끝나기 직전에 파티클 생성. 구멍 수가 바뀌었으면 다시 생성
  if (p > T.s2End - 0.06 && (!parts || builtWith !== state.punched)) buildParts();
  qTarget = cl((p - T.dissolve) / (T.dissolveEnd - T.dissolve), 0, 1);
  // 격자: 화면 2 가 페이드아웃되는 구간에 맞춰 이어받고, 타이핑 구간(T.typing→1) 동안 사라짐
  gridA = cl((p - T.s2End) / (T.dissolve - T.s2End + 0.03), 0, 1) * (1 - cl((p - T.typing) / (1 - T.typing), 0, 1));
  const now = performance.now();
  setStep(p, now);
  if (o3 > 0.01) wake();
  else { qCur = qTarget; typing(now); }                        // 화면 3이 안 보일 땐 바로 맞춤
}

export function initStage3() {
  sizeCanvas();
}
