/* ═══════════ 슬로건 — 맨 마지막 휠 (2026-09-26 사용자 요청) ═══════════
 *
 * "Meaning in every Margin." — ABOUT·E·노트북이 나간 뒤(about.js exitAbout) 휠을 한 번 더 굴리면 나온다.
 *   ① 남아 있던 초록 M(ME 의 M)이 바닥선으로 접혀 선이 되고, 격자 아랫선을 따라 오른쪽으로 달려가
 *      슬로건 자리에서 Meaning 의 M 으로 펴진다 — 그림은 stage1.js renderWork 가 이 모듈의 sloganPhase·sloganM 을 보고 그린다.
 *   ② 이어서 나머지 글자(eaning in every Margin.)가 한 글자씩 타이핑된다 — 페이드 없이 톡톡, 치는 동안만 커서.
 *   휠을 올리면 같은 시간축을 거꾸로 — 뒤에서부터 지워지고 M 이 선이 되어 ME 자리로 돌아간다.
 * 자리: 오른쪽 아래. 오른끝은 격자 오른선에서 PAD(WORK 의 W 와 같은 20) 안쪽, 글자 기준선은 아랫선에서 g·y 꼬리만큼 위
 *   (격자 밖은 무대가 잘라내서 꼬리가 잘리지 않게). M 그림은 대문자 높이(--s1sloganCap × 격자 세로 배율)에 맞춰 줄어들어 도착하고,
 *   나머지는 Chillax Medium 검정(네모박스 DRAG 와 같은 영어 글꼴). Margin 의 M 은 검정 글자 — 색은 첫 M 하나만.
 * --s1sloganCap: 대문자 높이(1920 기준 px) · --s1sloganRun: M 이 접혀 달려가 펴지는 시간 · --s1sloganType: 한 글자 치는 간격 (stage1.css)
 */
import { $, tempo } from '../utils.js';

const REST = 'eaning in every Margin.';
const M_RATIO = 482.636 / 378;                               // M 그림(m.svg) 가로 : 세로
const PAD = 20, GAP = 0.05;                                  // 오른쪽 여백(무대 px) · M 그림과 e 사이(글자 크기 대비)
const stage = $('#s1stage'), el = $('#s1slogan'), txt = el.querySelector('span'), caret = el.querySelector('i');
let redraw = () => {};
let sm = 0, smTo = 0, raf = 0, lastT = 0, runMs = 1400, typeMs = 60;   // sm: M 이동 + 타이핑을 합친 시간축(ms)
let stageH = 1080, fm = null, lay = null;                    // 글꼴 치수(글자 크기 대비) · 지금 자리
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const css = (n) => getComputedStyle(stage).getPropertyValue(n);
const total = () => runMs + REST.length * typeMs;

function readVars() {
  runMs = Math.max(1, (parseFloat(css('--s1sloganRun')) || 1.4) * 1000);
  typeMs = Math.max(1, (parseFloat(css('--s1sloganType')) || 0.06) * 1000);
}
function metrics() {                                         // Chillax 치수 — 대문자 높이 · g·y 꼬리 · 줄 상자 윗변에서 기준선까지(line-height 1) · 나머지 글자 폭
  const g = document.createElement('canvas').getContext('2d');
  g.font = "500 100px 'Chillax'";
  const cap = g.measureText('M').actualBoundingBoxAscent / 100, desc = g.measureText('gy').actualBoundingBoxDescent / 100;
  const m = g.measureText(REST), asc = m.fontBoundingBoxAscent / 100, dsc = m.fontBoundingBoxDescent / 100;
  return { cap, desc, base: (1 - (asc + dsc)) / 2 + asc, w: m.width / 100 };
}
function layout() {
  if (!fm) fm = metrics();
  const sy = Math.max(1, stageH - 120) / 960, cap = (parseFloat(css('--s1sloganCap')) || 64) * sy;
  const fs = cap / fm.cap, h = cap, w = h * M_RATIO, gap = GAP * fs, tw = fm.w * fs;
  const x = 1920 - 60 - PAD - tw - gap - w, lift = fm.desc * fs + 4;   // 기준선 = 아랫선에서 꼬리 + 4px 위
  lay = { x, w, h, lift, fs, tx: x + w + gap, base: stageH - 60 - lift };
  el.style.fontSize = fs + 'px';
  el.style.left = lay.tx + 'px';
  el.style.top = lay.base - fm.base * fs + 'px';
  caret.style.height = fm.cap + 'em';
}
function render() {
  const n = clamp(Math.floor((sm - runMs) / typeMs + 1e-6), 0, REST.length);   // 친 글자 수
  txt.textContent = REST.slice(0, n);
  caret.classList.toggle('on', sm > runMs && sm < total());
}
function tick(now) {
  const dt = Math.max(0, Math.min(50, now - lastT)) * tempo.k; lastT = now;   // tempo: 섹션 이동 중이면 빨리 (utils.js)
  sm = smTo > sm ? Math.min(smTo, sm + dt) : Math.max(smTo, sm - dt);
  if (sm === 0 && smTo === 0) el.classList.remove('on');
  render(); redraw();
  raf = sm !== smTo ? requestAnimationFrame(tick) : 0;
}
function kick() { if (!raf) { lastT = performance.now(); raf = requestAnimationFrame(tick); } }

/* ── stage1.js 가 부르는 것 ── */
export const sloganShown = () => smTo > 0;
export const sloganPhase = () => clamp(sm / runMs, 0, 1);    // M 이 접혀 달려가 펴진 정도 (renderWork)
export const sloganProgress = () => clamp(sm / total(), 0, 1);   // 아래 여백 막대(stage1.js paintScroll)가 쓰는 진행도 — 다 치면 END 에 닿음
export const sloganM = () => { if (!lay) layout(); return lay; };   // 슬로건 M 자리 — 무대 좌표 x · 폭 w · 높이 h · 아랫선에서 기준선까지 lift
export function sloganSizing(h) {                            // stage1.js sizing() — 격자 높이가 바뀌면 크기·자리도
  if (!isFinite(h)) return;
  stageH = h;
  layout();
}
export function showSlogan() {
  readVars();
  if (smTo === total()) return 0;
  layout();
  smTo = total(); el.classList.add('on');
  render(); kick();
  return smTo - sm;
}
export function hideSlogan() {
  if (smTo === 0) return 0;
  readVars();
  smTo = 0; kick();
  return sm;
}
export function initSlogan(onFrame) {
  redraw = onFrame;
  // 글꼴이 오면 치수를 다시 잼 — 그 전엔 대체 글꼴 치수라 자리가 어긋난다
  if (document.fonts) document.fonts.load("500 100px 'Chillax'").then(() => { fm = null; layout(); if (sm > 0) redraw(); }, () => {});
}
