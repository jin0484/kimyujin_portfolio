/* ═══════════ STAGE 1 — Figma "#1" 프레임 (1920 기준) ═══════════
 *
 * 격자(SVG) + 왼쪽 2단을 채운 본문(메인 컬러) + 하단 거대 KIM YUJIN(글자 하나하나 SVG) + 노트북.
 * 무대(#s1stage)는 폭 1920 고정, 화면 폭에 맞춰 scale. 높이는 뷰포트 높이 ÷ scale 로 잡아
 * 격자·본문은 위아래로 늘어나고 KIM YUJIN 은 바닥에 붙는다.
 * 좌표·크기는 Figma 값 그대로 (src/styles/stage1.css). 본문 글은 data.js 의 DUMMY.
 * 본문: 처음 들어올 때 위에서 아래로 한 줄씩 드러남 (clip-path 를 줄 수만큼의 steps 로 내림).
 * 휠: 첫 휠에 KIM↔YUJIN 스왑(#2 프레임)까지 가서 멈추고, 다음 휠에 화면1.pdf 의 8프레임을 하나의 흐름으로 지나감(FRAMES). 올리면 그 자리에서 되감김.
 */
import { prepareWithSegments, layoutWithLines } from '@chenglou/pretext';
import { DUMMY } from '../data.js';
import { $ } from '../utils.js';

const stage = $('#s1stage'), body = $('#s1body'), bodyClip = $('#s1bodyclip'),
      year = $('#s1year'), laptop = $('#s1laptop'), letters = [...stage.querySelectorAll('#s1name img')];
const DW = 1920;

export function sizing() {
  const s = window.innerWidth / DW;
  stage.style.height = (window.innerHeight / s) + 'px';
  stage.style.transform = 'scale(' + s + ')';
}

export function refresh() { sizing(); }

/* ── 휠 시퀀스 — 화면1.pdf 8프레임 (값은 PDF 에서 그대로 읽음, 1920×1080 기준) ──
 *  clip: 본문 창 [left, width, height]   text: 문단 [left, width]   (창 안 문단 left = text.left − clip.left)
 *  name: KIM YUJIN 이 아래로 내려간 거리(px, 378 이상이면 창 밖)   year: 2026 PORTFOLIO 가 창 안에서 올라간 거리(px, 25 이상이면 창 밖)   laptop: bottom
 *  swap: KIM↔YUJIN 배치 (0 = KIM 크게, 1 = YUJIN 크게)   stop: 여기서 멈춤(다음 휠에 이어감)   ms: 이 프레임까지 오는 시간(없으면 --s1step)
 *  프레임은 경유지일 뿐 — 위치(프레임 단위) 하나를 rAF 로 굴리고, 정지점 사이 구간마다 이징을 한 번만 건 뒤
 *  프레임 사이를 선형 보간해서 매 프레임 인라인 스타일로 찍는다. 휠 올리면 같은 위치가 거꾸로 줄어 정방향의 거울로 되감김. */
const FRAMES = [
  { clip: [61, 585, null],  text: [61, 585],   align: "justify", name: 0,   year: 0,   laptop: 314,   swap: 0 },                      // 1 기본 — KIM 크게
  { clip: [61, 585, null],  text: [61, 585],   align: "justify", name: 0,   year: 0,   laptop: 453.6, swap: 1, stop: true, ms: 700 }, // 1' 스왑 — YUJIN 크게 (여기서 멈춤)
  { clip: [61, 585, null],  text: [61, 585],   align: "justify", name: 0,   year: 0,   laptop: 314,   swap: 0, stop: true, ms: 700 }, // 1'' 다시 KIM 크게 (여기서 멈춤)
  { clip: [61, 585, 340],   text: [61, 585],   align: "justify", name: 78,  year: 35,  laptop: 226,   swap: 0 },   // 2 문단이 짧아짐 (13줄)
  { clip: [61, 887, 340],   text: [61, 887],   align: "left",    name: 165, year: 100, laptop: 156,   swap: 0 },   // 3 옆으로 길어지며 왼끝 맞춤으로
  { clip: [61, 1189, 340],  text: [61, 1189],  align: "left",    name: 420, year: 100, laptop: 60,    swap: 0 },   // 4 4단 폭
  { clip: [363, 1189, 340], text: [363, 1189], align: "left",    name: 420, year: 100, laptop: 60,    swap: 0 },   // 5 그대로 옆으로 이동
  { clip: [670, 1189, 340], text: [670, 1189], align: "right",   name: 420, year: 100, laptop: 60,    swap: 0 },   // 6 오른쪽 끝에 닿으며 오른끝 맞춤으로
  { clip: [971, 888, 340],  text: [693, 1189], align: "right",   name: 420, year: 100, laptop: 60,    swap: 0 },   // 7 창이 왼쪽부터 닫힘
  { clip: [1273, 586, 340], text: [1273, 586], align: "right",   name: 420, year: 100, laptop: 60,    swap: 0 },   // 8 2단으로 좁아져 오른끝 맞춤으로 멈춤
];
// 글자 8개(k i m y u j i2 n)의 두 배치 — #s1name 창 기준 [left, bottom, width, height]. swap 0 = KIM 크게(Figma #1), 1 = YUJIN 크게(#2)
const NAME_A = [[0, 0.14, 249.138, 370.86], [301.024, 0.18, 56.441, 370.817], [408.425, 0, 482.636, 378], [908, 0, 195, 234], [1152, 0, 187, 234], [1387.601, 0, 84.118, 233.997], [1521, 1, 34, 233], [1603.629, -0.4, 193.889, 234.404]];
const NAME_B = [[-1, 0, 156, 232], [187, 0, 35, 232], [254, 0, 301, 236], [524, -0.4, 312, 374], [876.482, -0.4, 300, 374], [1215.482, -0.4, 136, 374], [1390.482, 0.6, 55, 373], [1486.482, -0.4, 312, 374]];

// CSS cubic-bezier(x1,y1,x2,y2) 를 t→진행도 함수로 (--s1stepEase 를 그대로 쓰기 위해)
function bezier(x1, y1, x2, y2) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const X = (t) => ((ax * t + bx) * t + cx) * t, Y = (t) => ((ay * t + by) * t + cy) * t;
  return (x) => { let t = x; for (let i = 0; i < 8; i++) { const e = X(t) - x; if (Math.abs(e) < 1e-5) break; t -= e / ((3 * ax * t + 2 * bx) * t + cx || 1e-6); } return Y(Math.min(1, Math.max(0, t))); };
}
function easeFn() {
  const m = /cubic-bezier\(([^)]+)\)/.exec(getComputedStyle(stage).getPropertyValue("--s1stepEase"));
  return m ? bezier(...m[1].split(",").map(Number)) : bezier(0.5, 0, 0.5, 1);
}
const lerp = (a, b, t) => a + (b - a) * t;

/* ── 본문 단어 조판 (Pretext): 문단을 prepareWithSegments 로 한 번 재두고(캔버스 측정 1회), 프레임마다 다른 폭에서
 *  layoutWithLines 로 줄을 나눈다(DOM 없이 산술만). 정렬(양끝/왼끝/오른끝)은 줄 폭의 남는 값으로 우리가 x 를 놓는다.
 *  조판이 다른 두 프레임 사이에서는 단어를 움직이지 않고 두 조판을 겹쳐 놓고 크로스페이드한다(Figma 스마트 애니메이트와 같은 방식) —
 *  단어가 줄을 건너 날아다니며 뒤섞이는 걸 막기 위해. 창·문단의 위치·폭만 같은 이징으로 움직인다. */
const FONT = "500 18px Pretendard, Archivo, 'Gothic A1', sans-serif", LH = 26, LS = -0.36;   // stage1.css #s1body 와 같아야 함
const TEXT = DUMMY.repeat(6).trim().replace(/\s+/g, " "), WORDS = TEXT.split(" ");
let wordEls = [], wordEls2 = [], wordW = null, prepared = null, layouts = new Map();   // wordEls2: 크로스페이드용 두 번째 벌. layouts: "폭|정렬" → [{x,y}]
function measureWords() {
  prepared = prepareWithSegments(TEXT, FONT, { wordBreak: "keep-all", letterSpacing: LS });   // 단어 사이(공백)에서만 줄바꿈
  const c = document.createElement("canvas").getContext("2d");
  c.font = FONT; if ("letterSpacing" in c) c.letterSpacing = LS + "px";
  wordW = WORDS.map((w) => c.measureText(w).width + ("letterSpacing" in c ? 0 : LS * w.length));
  wordW.space = c.measureText(" ").width;
}
function layoutFor(width, align = "left") {
  const key = width + "|" + align;
  if (layouts.has(key)) return layouts.get(key);
  const { lines } = layoutWithLines(prepared, width, LH);
  const out = new Array(WORDS.length); let wi = 0;
  lines.forEach((line, li) => {
    const n = line.text.trim().split(" ").filter(Boolean).length;
    let lw = 0; for (let k = 0; k < n; k++) lw += wordW[wi + k]; lw += wordW.space * (n - 1);
    const slack = Math.max(0, width - lw), last = li === lines.length - 1;
    let x = align === "right" ? slack : 0;
    const extra = align === "justify" && !last && n > 1 ? slack / (n - 1) : 0;   // 양끝맞춤: 남는 폭을 단어 사이에 (마지막 줄 제외)
    for (let k = 0; k < n; k++) { out[wi] = { x, y: li * LH }; x += wordW[wi] + wordW.space + extra; wi++; }
  });
  for (; wi < WORDS.length; wi++) out[wi] = { x: 0, y: lines.length * LH };   // 혹시 남으면 아래로
  layouts.set(key, out);
  return out;
}
function buildWords() {                                     // 문단 → 단어 span 두 벌 (처음 한 번)
  if (wordW) return;
  measureWords();
  body.textContent = "";
  const mk = () => { const g = document.createElement("span"); g.className = "layer"; g.append(...WORDS.map((w) => { const e = document.createElement("span"); e.textContent = w; return e; })); body.appendChild(g); return [...g.children]; };
  wordEls = mk(); wordEls2 = mk();
  layerA = wordEls[0].parentNode; layerB = wordEls2[0].parentNode;
  placeWords(layoutFor(FRAMES[0].text[1], FRAMES[0].align), null, 0, FRAMES[0].text[1] + "|" + FRAMES[0].align);
}
let layerA = null, layerB = null, keyA = "", keyB = "";
function setLayout(els, L) { for (let i = 0; i < els.length; i++) els[i].style.transform = "translate(" + L[i].x.toFixed(1) + "px," + L[i].y.toFixed(1) + "px)"; }
// A 조판 하나만 (t 없음) 또는 A→B 크로스페이드 (t: 0~1). 조판이 같으면 페이드 없이 A 만
function placeWords(LA, LB, t, ka = "", kb = "") {
  if (!layerA) return;
  if (ka !== keyA) { setLayout(wordEls, LA); keyA = ka; }
  const fade = LB && ka !== kb;
  if (fade && kb !== keyB) { setLayout(wordEls2, LB); keyB = kb; }
  layerA.style.opacity = fade ? 1 - t : 1;
  layerB.style.opacity = fade ? t : 0;
}

let pos = 0, dir = 0, raf = 0, lastT = 0, fullH = 0, ease = null, lockUntil = 0;   // pos: 프레임 단위 위치 0 ~ n
const N = FRAMES.length - 1;
const STOPS = [0, ...FRAMES.map((f, i) => (f.stop ? i : -1)).filter((i) => i > 0), N];   // 정지점들 (양 끝 포함)
function render(q) {                                        // q: 이징 적용된 위치(프레임 단위) → 프레임 사이 보간
  q = Math.min(N, Math.max(0, q));
  const i = Math.min(N - 1, Math.floor(q)), t = q - i;
  const A = FRAMES[i], B = FRAMES[i + 1];
  const clipL = lerp(A.clip[0], B.clip[0], t), clipW = lerp(A.clip[1], B.clip[1], t), clipH = lerp(A.clip[2] ?? fullH, B.clip[2] ?? fullH, t);
  bodyClip.style.left = clipL + "px"; bodyClip.style.width = clipW + "px"; bodyClip.style.height = clipH + "px";
  body.style.left = (lerp(A.text[0], B.text[0], t) - clipL) + "px"; body.style.width = lerp(A.text[1], B.text[1], t) + "px";
  const ka = A.text[1] + "|" + A.align, kb = B.text[1] + "|" + B.align;
  placeWords(layoutFor(A.text[1], A.align), layoutFor(B.text[1], B.align), t, ka, kb);   // 조판이 다르면 크로스페이드
  year.style.transform = "translateY(" + (-lerp(A.year, B.year, t)) + "px)";
  laptop.style.bottom = lerp(A.laptop, B.laptop, t) + "px";
  const sw = lerp(A.swap, B.swap, t), ny = lerp(A.name, B.name, t);
  letters.forEach((e, k) => {                              // 글자: KIM↔YUJIN 배치 보간 + 아래로 내려간 거리
    const P = NAME_A[k], Q = NAME_B[k];
    e.style.left = lerp(P[0], Q[0], sw) + "px"; e.style.bottom = lerp(P[1], Q[1], sw) + "px";
    e.style.width = lerp(P[2], Q[2], sw) + "px"; e.style.height = lerp(P[3], Q[3], sw) + "px";
    e.style.transform = "translateY(" + ny + "px)";
  });
}
function clear() {                                          // 위치 0 — 인라인 지우고 CSS 값으로
  bodyClip.style.left = bodyClip.style.width = bodyClip.style.height = "";
  body.style.left = body.style.width = ""; year.style.transform = ""; laptop.style.bottom = "";
  for (const e of letters) e.style.left = e.style.bottom = e.style.width = e.style.height = e.style.transform = "";
  placeWords(layoutFor(FRAMES[0].text[1], FRAMES[0].align), null, 0, FRAMES[0].text[1] + "|" + FRAMES[0].align);
}
const stepMs = () => (parseFloat(getComputedStyle(stage).getPropertyValue("--s1step")) || 0.5) * 1000;
function eased(x) {                                         // 정지점 사이 구간 안에서 이징 (정지점 위에선 그대로)
  if (STOPS.includes(x)) return x;
  let s0 = 0, s1 = N;
  for (const st of STOPS) { if (st < x) s0 = st; else { s1 = st; break; } }
  return s0 + ease((x - s0) / (s1 - s0)) * (s1 - s0);
}
function tick(now) {
  // rAF 타임스탬프는 프레임 시작 시각이라 휠 핸들러에서 찍은 lastT 보다 과거일 수 있음 → 음수 dt 는 0 으로
  const dt = Math.max(0, Math.min(50, now - lastT)); lastT = now;
  const i = dir > 0 ? Math.floor(pos) : Math.ceil(pos) - 1;            // 지금 지나는 구간 (프레임 i → i+1)
  const ms = FRAMES[Math.min(N, Math.max(1, i + 1))].ms || stepMs();
  const before = pos;
  pos += dir * dt / ms;
  // 정지점: 진행 방향으로 처음 만나는 정지점을 넘으면 거기서 멈춤
  const stop = dir > 0 ? STOPS.find((st) => st > before && st <= pos) : [...STOPS].reverse().find((st) => st < before && st >= pos);
  if (stop !== undefined) { pos = stop; dir = 0; lockUntil = now + 400; }   // 같은 휠 동작이 정지점을 뚫지 않게 잠깐 잠금
  render(eased(pos));
  if (dir === 0 && pos === 0) clear();
  raf = dir ? requestAnimationFrame(tick) : 0;
}
const atStart = () => pos === 0 && dir === 0;
function play(d) {
  if ((d > 0 && pos >= N) || (d < 0 && pos <= 0)) return;
  if (dir === 0 && performance.now() < lockUntil) return;
  buildWords();
  if (atStart()) {                                          // 출발할 때 한 번 잼
    fullH = bodyClip.getBoundingClientRect().height / (window.innerWidth / DW);
    ease = easeFn();
  }
  dir = d;
  if (!raf) { lastT = performance.now(); raf = requestAnimationFrame(tick); }
}
const LINE = 26, LINE_MS = 38;   // 본문 행간(px) · 한 줄 드러나는 간격(ms)
export function initStage1() {
  body.textContent = DUMMY.repeat(6);                         // 폰트 오기 전엔 문단 그대로
  sizing();
  const ready = document.fonts ? document.fonts.load(FONT).then(() => document.fonts.ready) : Promise.resolve();
  ready.then(buildWords);
  setTimeout(() => {                                          // 본문 한 줄씩 드러내기
    const n = Math.max(1, Math.floor(bodyClip.clientHeight / LINE));
    body.style.transition = 'clip-path ' + (n * LINE_MS) + 'ms steps(' + n + ', end)';
    body.style.clipPath = 'inset(0 0 0 0)';
    setTimeout(() => { body.style.transition = ''; }, n * LINE_MS + 50);   // 끝나면 시퀀스용 transition 으로 복귀
  }, 150);
  // 휠 — 캡처 단계에서 받아서 어떤 요소 위에 있든 잡음. deltaMode 가 줄/페이지 단위인 환경(Firefox 등)도 방향만 보면 되므로 그대로
  window.addEventListener('wheel', (e) => { if (e.deltaY !== 0) play(e.deltaY > 0 ? 1 : -1); }, { passive: true, capture: true });
  // 키보드 — ↓/PageDown/Space 앞으로, ↑/PageUp 뒤로
  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ') play(1);
    else if (e.key === 'ArrowUp' || e.key === 'PageUp') play(-1);
  });
  // 터치 — 세로 스와이프
  let ty = null;
  document.addEventListener('touchstart', (e) => { ty = e.touches[0].clientY; }, { passive: true });
  document.addEventListener('touchmove', (e) => { if (ty == null) return; const d = ty - e.touches[0].clientY; if (Math.abs(d) > 24) { play(d > 0 ? 1 : -1); ty = null; } }, { passive: true });
}

