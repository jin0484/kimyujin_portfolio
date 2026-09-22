/* ═══════════ STAGE 1 — Figma "#1" 프레임 (1920 기준) ═══════════
 *
 * 격자(SVG) + 왼쪽 2단을 채운 본문(메인 컬러) + 하단 거대 KIM YUJIN(글자 하나하나 SVG) + 노트북.
 * 무대(#s1stage)는 폭 1920 고정, 화면 폭에 맞춰 scale. 높이는 뷰포트 높이 ÷ scale 로 잡아
 * 격자·본문은 위아래로 늘어나고 KIM YUJIN 은 바닥에 붙는다.
 * 좌표·크기는 Figma 값 그대로 (src/styles/stage1.css). 본문 글은 data.js 의 DUMMY.
 * 본문: 처음 들어올 때 위에서 아래로 한 줄씩 드러남 (clip-path 를 줄 수만큼의 steps 로 내림).
 * 호버: YUJIN 글자에 올리면 #2 프레임 배치(YUJIN 크게·KIM 작게)로, 작아진 KIM 에 올리면 #1 로 돌아옴.
 * 휠: 한 번 내리면 화면1.pdf 의 8프레임을 하나의 흐름으로 지나감(FRAMES, --s1step × 7). 올리면 그 자리에서 되감김.
 */
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
 *  프레임은 경유지일 뿐 — 진행도(0~1) 하나를 rAF 로 굴리고, 이징은 전체 경로에 한 번만 건 뒤
 *  프레임 사이를 선형 보간해서 매 프레임 인라인 스타일로 찍는다 (프레임마다 멈추지 않음).
 *  휠 올리면 같은 진행도가 거꾸로 줄어들어 정방향의 거울로 되감김. 진행도 0 이면 인라인을 지워 호버 스왑(CSS) 이 값을 가짐. */
const FRAMES = [
  { clip: [61, 585, null],  text: [61, 585],   name: 0,   year: 0,   laptop: 314 },   // 1 기본 (height null = 뷰포트에 맞춤)
  { clip: [61, 585, 340],   text: [61, 585],   name: 78,  year: 35,  laptop: 226 },   // 2 본문 13줄로, 글자·노트북 내려가고 라벨 올라감
  { clip: [61, 887, 340],   text: [61, 887],   name: 165, year: 100, laptop: 156 },   // 3 본문 3단으로
  { clip: [61, 1189, 340],  text: [61, 1189],  name: 420, year: 100, laptop: 60 },    // 4 본문 4단, 글자는 창 밖, 노트북 바닥
  { clip: [363, 1189, 340], text: [363, 1189], name: 420, year: 100, laptop: 60 },    // 5 오른쪽으로 한 단
  { clip: [670, 1189, 340], text: [670, 1189], name: 420, year: 100, laptop: 60 },    // 6 또 한 단
  { clip: [971, 888, 340],  text: [693, 1189], name: 420, year: 100, laptop: 60 },    // 7 창이 왼쪽부터 닫힘
  { clip: [1273, 586, 340], text: [995, 1189], name: 420, year: 100, laptop: 60 },    // 8 두 단만 남고 글은 오른쪽으로
];

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

let prog = 0, dir = 0, raf = 0, lastT = 0, fullH = 0, ease = null;
function render(u) {                                        // u: 이징 적용된 진행도 0~1 → 프레임 사이 보간
  u = Math.min(1, Math.max(0, u));
  const n = FRAMES.length - 1, pos = u * n, i = Math.min(n - 1, Math.floor(pos)), t = pos - i;
  const A = FRAMES[i], B = FRAMES[i + 1];
  const clipL = lerp(A.clip[0], B.clip[0], t), clipW = lerp(A.clip[1], B.clip[1], t), clipH = lerp(A.clip[2] ?? fullH, B.clip[2] ?? fullH, t);
  bodyClip.style.left = clipL + "px"; bodyClip.style.width = clipW + "px"; bodyClip.style.height = clipH + "px";
  body.style.left = (lerp(A.text[0], B.text[0], t) - clipL) + "px"; body.style.width = lerp(A.text[1], B.text[1], t) + "px";
  year.style.transform = "translateY(" + (-lerp(A.year, B.year, t)) + "px)";
  laptop.style.bottom = lerp(A.laptop, B.laptop, t) + "px";
  const ny = "translateY(" + lerp(A.name, B.name, t) + "px)";
  for (const e of letters) e.style.transform = ny;
}
function clear() {                                          // 진행도 0 — 인라인 지우고 CSS(호버 스왑) 로
  laptop.style.transition = "";
  bodyClip.style.left = bodyClip.style.width = bodyClip.style.height = "";
  body.style.left = body.style.width = ""; year.style.transform = ""; laptop.style.bottom = "";
  for (const e of letters) e.style.transform = "";
}
function tick(now) {
  const total = (parseFloat(getComputedStyle(stage).getPropertyValue("--s1step")) || 0.5) * 1000 * (FRAMES.length - 1);
  prog += dir * Math.min(50, now - lastT) / total; lastT = now;
  if (prog <= 0) { prog = 0; dir = 0; clear(); raf = 0; return; }
  if (prog >= 1) { prog = 1; dir = 0; }
  render(ease(prog));
  raf = dir ? requestAnimationFrame(tick) : 0;
}
const atStart = () => prog === 0 && dir === 0;
function play(d) {
  if ((d > 0 && prog >= 1) || (d < 0 && prog <= 0)) return;
  if (atStart()) {                                          // 출발할 때 한 번 잼
    fullH = bodyClip.getBoundingClientRect().height / (window.innerWidth / DW);
    ease = easeFn();
    stage.classList.remove("yujin");
    laptop.style.transition = "none";                        // 호버용 transition 이 매 프레임 값을 뭉개지 않게
  }
  dir = d;
  if (!raf) { lastT = performance.now(); raf = requestAnimationFrame(tick); }
}
const LINE = 26, LINE_MS = 38;   // 본문 행간(px) · 한 줄 드러나는 간격(ms)
export function initStage1() {
  body.textContent = DUMMY.repeat(6);
  sizing();
  setTimeout(() => {                                          // 본문 한 줄씩 드러내기
    const n = Math.max(1, Math.floor(bodyClip.clientHeight / LINE));
    body.style.transition = 'clip-path ' + (n * LINE_MS) + 'ms steps(' + n + ', end)';
    body.style.clipPath = 'inset(0 0 0 0)';
    setTimeout(() => { body.style.transition = ''; }, n * LINE_MS + 50);   // 끝나면 시퀀스용 transition 으로 복귀
  }, 150);
  for (const e of stage.querySelectorAll('.s1-y, .s1-u, .s1-j, .s1-i2, .s1-n')) e.addEventListener('pointerenter', () => { if (atStart()) stage.classList.add('yujin'); });
  for (const e of stage.querySelectorAll('.s1-k, .s1-i, .s1-m')) e.addEventListener('pointerenter', () => { if (atStart()) stage.classList.remove('yujin'); });
  window.addEventListener('wheel', (e) => { if (Math.abs(e.deltaY) > 4) play(e.deltaY > 0 ? 1 : -1); }, { passive: true });
}

