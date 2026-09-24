/* ═══════════ STAGE 1 — Figma "#1" 프레임 (1920 기준) ═══════════
 *
 * 격자(SVG) + 왼쪽 2단을 채운 본문(메인 컬러) + 하단 거대 KIM YUJIN(글자 하나하나 SVG) + 노트북.
 * 무대(#s1stage)는 폭 1920 고정, 화면 폭에 맞춰 scale. 높이는 뷰포트 높이 ÷ scale 로 잡아
 * 격자·본문은 위아래로 늘어나고 KIM YUJIN 은 바닥에 붙는다.
 * 좌표·크기는 Figma 값 그대로 (src/styles/stage1.css). 본문 글은 data.js 의 DUMMY · DUMMY2.
 * 본문: 처음 들어올 때 위에서 아래로 한 줄씩 드러남 (clip-path 를 줄 수만큼의 steps 로 내림).
 * 휠: 첫 휠에 퇴장 시퀀스, 두 번째 휠에 왼쪽 아래 네모박스(box.js — 드래그로 격자를 밀어냄),
 *     세 번째 휠에 박스·오른쪽 위 초록 글이 작아지며 사라짐(box.js clearBox, Figma 152:1046),
 *     네 번째(마지막) 휠에 격자 가로줄이 갈아끼워지면서 그 위로 ABOUT ME 가 돌아 들어옴(box.js morphGrid + about.js, Figma 167:2190 · 167:2388).
 *     (Figma "휠 이벤트 정리 표" 135:800)
 *     KIM↔YUJIN 스왑 정지점 두 개는 2026-09-23 삭제 — 필요하면 커밋 c2ebafb 의 FRAMES·NAME_B 참고
 *
 * 트랙이 둘 — 둘 다 같은 위치(pos)를 보지만 표는 따로다:
 *   FRAMES : KIM YUJIN · 2026 PORTFOLIO · 노트북   (화면1.pdf, 10프레임)
 *   BODY   : 초록 작은 글자                        (Figma "초록 작은 글자 모션" 섹션 120:1010, 26프레임)
 * 본문 프레임이 훨씬 촘촘해서 한 표에 못 담는다. 나눠두면 한쪽을 고쳐도 다른 쪽 타이밍이 안 흔들린다.
 */
import { prepareWithSegments, layoutWithLines, layoutNextLine } from '@chenglou/pretext';
import { DUMMY, DUMMY2 } from '../data.js';
import { $, bezier, tempo } from '../utils.js';
import { initBox, boxSizing, boxRefresh, showBox, hideBox, boxShown, clearBox, unclearBox, boxCleared, morphGrid, unmorphGrid, gridMorphed, boxProgress, lineProgress } from './box.js';
import { syncGlass, reserveGlass } from '../glass.js';
import { syncBits } from '../glassBits.js';
import { setOrb } from '../glassOrb.js';
import { initAbout, aboutSizing, showAbout, hideAbout, aboutShown, openCv, closeCv, cvShown } from './about.js';

/* ── 아래 여백의 SCROLL DOWN (index.html #s1scroll) ──
 *  첫 화면에선 올라와 둥둥 떠 있다가, 스크롤을 내리기 시작하면 납작하게 눌려 막대가 되고
 *  그 막대가 휠 진행만큼 채워진다. 진행도는 네 단계를 이어붙인 것:
 *    퇴장(pos/N) + 박스 등장·사라짐(box.js boxProgress) + 격자 가로줄·ABOUT ME(box.js lineProgress)
 *  되감아 첫 화면으로 돌아오면 막대가 다시 글자로 펴진다. */
const scrollEl = $('#s1scroll'), scrollFill = scrollEl.querySelector('u');
const SCROLL_STAGES = 4;
const scrollHint = (on) => scrollEl.classList.toggle('on', on);
let hintUpAt = Infinity, barT = 0;                          // 글자가 다 올라오는 시각 — 그 전에 굴리면 눌리는 걸 못 보므로 기다렸다 시작
function scrollBar(on) {
  clearTimeout(barT);
  if (!on) {
    if (scrollEl.classList.contains('bar')) {               // 막대 → 글자로 도로 펴짐 (같은 동작을 거꾸로)
      scrollEl.classList.remove('bar'); scrollEl.classList.add('unbar');
      const ms = (parseFloat(getComputedStyle(scrollEl).getPropertyValue('--s1scrollSquash')) || 1.2) * 1000;
      barT = setTimeout(() => scrollEl.classList.remove('unbar'), ms);
    }
    return;
  }
  scrollEl.classList.remove('unbar');
  const left = hintUpAt - performance.now();
  if (left > 0) barT = setTimeout(() => scrollEl.classList.add('bar'), left);
  else scrollEl.classList.add('bar');
}
const navBtns = [...document.querySelectorAll('#s1nav button')];   // 막대 위 섹션 이름 — KIM YUJIN · WORK · ABOUT ME (아래 jump)
function paintScroll() {
  const p = (pos / N + boxProgress() + lineProgress()) / SCROLL_STAGES;
  scrollFill.style.width = Math.min(100, Math.max(0, p * 100)) + '%';
  const st = jumpTo >= 0 ? jumpTo : stepNow(), sec = st >= 4 ? 2 : st >= 2 ? 1 : 0;   // 가는 중이면 가는 곳을 미리 진하게
  navBtns.forEach((b, i) => b.classList.toggle('on', i === sec));
  if (work.classList.contains('on') !== (pos > 0 && !(aboutShown() || gridMorphed()))) renderWork(eased(pos));   // ABOUT ME 가 들어오고 나갈 때 WORK 숨김/다시
  setOrb(pos / N, boxProgress(), aboutShown() || gridMorphed());   // 화면2 유리 구슬에 진행 상태 (glassOrb.js)
}
let barRaf = 0;                                             // 박스·격자 단계는 저쪽 모듈이 따로 굴려서, 그동안만 따라 그린다
function followBar(ms) {
  const t0 = performance.now();
  const step = (now) => { paintScroll(); barRaf = now - t0 < ms + 150 ? requestAnimationFrame(step) : 0; };
  if (!barRaf) barRaf = requestAnimationFrame(step);
}
const stage = $('#s1stage'), body = $('#s1body'), bodyClip = $('#s1bodyclip'),
      year = $('#s1year'), laptop = $('#s1laptop'), letters = [...stage.querySelectorAll('#s1name img')];
const DW = 1920;

export function sizing() {
  const s = window.innerWidth / DW;
  stage.style.height = (window.innerHeight / s) + 'px';
  stage.style.transform = 'scale(' + s + ')';
  boxSizing(window.innerHeight / s, s);                       // 격자 선 · 네모박스 (box.js)
  aboutSizing(window.innerHeight / s);                        // ABOUT ME (about.js)
}

export function refresh() {                                   // 리사이즈 · 폰트 로드 후 (main.js)
  sizing();
  if (tsA) { measureFill(); renderBody(pos); }                // 높이가 달라지면 채울 글 분량도 다시
  boxRefresh();                                               // 박스가 밀어낸 글상자 높이를 되살림
}

/* ── 휠 시퀀스 — 화면1.pdf (값은 PDF 에서 그대로 읽음, 1920×1080 기준) ──
 *  name: KIM YUJIN 이 아래로 내려간 거리(px, 378 이상이면 창 밖)   year: 2026 PORTFOLIO 가 창 안에서 올라간 거리(px, 25 이상이면 창 밖)
 *  laptop: bottom
 *  stop: 여기서 멈춤(다음 휠에 이어감)   ms: 이 프레임까지 오는 시간(없으면 --s1step)
 *  프레임은 경유지일 뿐 — 위치(프레임 단위) 하나를 rAF 로 굴리고, 정지점 사이 구간마다 이징을 한 번만 건 뒤
 *  프레임 사이를 선형 보간해서 매 프레임 인라인 스타일로 찍는다. 휠 올리면 같은 위치가 거꾸로 줄어 정방향의 거울로 되감김. */
const FRAMES = [
  { name: 0,   year: 0,   laptop: 314 },   // 1 기본
  { name: 78,  year: 35,  laptop: 226 },   // 2
  { name: 165, year: 100, laptop: 156 },   // 3
  { name: 420, year: 100, laptop: 60  },   // 4
  { name: 420, year: 100, laptop: 60  },   // 5
  { name: 420, year: 100, laptop: 60  },   // 6
  { name: 420, year: 100, laptop: 60  },   // 7
  { name: 420, year: 100, laptop: 60  },   // 8
];
/* ── 첫 화면 호버: YUJIN 에 올리면 YUJIN 크게 · KIM 작게(Figma #2, 100:19), KIM 에 올리면 다시 KIM 크게(#1) ──
 *  떼도 그 배치로 남는다. 휠 돌리기 전(pos 0)에만. 퇴장이 시작되면 KIM 크게로 돌아가며 같이 내려간다.
 *  글자 8개(k i m y u j i2 n) — #s1name 창 기준 [left, bottom, width, height]. 노트북은 YUJIN 크게일 때 SWAP_LIFT 만큼 더 올라감(Figma #2: bottom 453.6) */
const NAME_A = [[0, 0.14, 249.138, 370.86], [301.024, 0.18, 56.441, 370.817], [408.425, 0, 482.636, 378], [908, 0, 195, 234], [1152, 0, 187, 234], [1387.601, 0, 84.118, 233.997], [1521, 1, 34, 233], [1603.629, -0.4, 193.889, 234.404]];
const NAME_B = [[-1, 0, 156, 232], [187, 0, 35, 232], [254, 0, 301, 236], [524, -0.4, 312, 374], [876.482, -0.4, 300, 374], [1215.482, -0.4, 136, 374], [1390.482, 0.6, 55, 373], [1486.482, -0.4, 312, 374]];
const SWAP_LIFT = 453.6 - 314;

/* ── 본문 트랙 — Figma "초록 작은 글자 모션" 섹션(120:1010) 26프레임 ──
 *  글상자 하나가 오른쪽으로 열렸다가, 오른쪽에 붙은 채 왼쪽에서 닫힌다.
 *    ① #3~#16  왼쪽 61 고정, 오른쪽이 646 → 1860 까지 벌어짐
 *    ② #16→#17 상자는 그대로, 마지막 줄만 왼끝 → 오른끝 (오른쪽 끝에 닿았으므로)
 *    ③ #17→#18 글 내용이 DUMMY → DUMMY2 로 갈림
 *    ④ #18~#27 오른쪽 1860 고정, 왼쪽이 186 → 1273(격자 5번째 기둥)까지 좁혀져 2단으로 멈춤
 *  [left, width, height(null = 격자 전체 높이), lastAlign(0 왼끝 · 1 오른끝), text(0 = DUMMY · 1 = DUMMY2), fill(0 = 처음 분량 · 1 = 시퀀스 분량)]
 *  Figma 원본은 ②부터 오른쪽 끝이 1870 이었는데 10px 나간 게 실수라 격자 오른선 1860 으로 당겼다 —
 *  그래서 ②에서 상자가 아예 안 움직이고 정렬만 바뀐다. 마지막 프레임은 1273..1860 (폭 587). */
const BODY = [
  [  61,  585, null, 0, 0, 0],   // #3  들어온 직후 — 격자 높이를 꽉 채움
  [  61,  585,  479, 0, 0, 1],   // #3  18줄로 짧아짐
  [  61,  694,  479, 0, 0, 1],   // #4
  [  61,  765,  479, 0, 0, 1],   // #5
  [  61,  811,  479, 0, 0, 1],   // #6
  [  61,  887,  479, 0, 0, 1],   // #7
  [  61,  992,  479, 0, 0, 1],   // #8
  [  61, 1146,  479, 0, 0, 1],   // #9
  [  61, 1189,  479, 0, 0, 1],   // #10
  [  61, 1281,  479, 0, 0, 1],   // #11
  [  61, 1380,  479, 0, 0, 1],   // #12
  [  61, 1491,  479, 0, 0, 1],   // #13
  [  61, 1591,  479, 0, 0, 1],   // #14
  [  61, 1698,  479, 0, 0, 1],   // #15
  [  61, 1799,  479, 0, 0, 1],   // #16 오른쪽 끝(1860)에 닿음
  [  61, 1799,  479, 1, 0, 1],   // #17 ← 마지막 줄이 오른끝으로
  [ 186, 1674,  479, 1, 1, 1],   // #18 ← 여기서 글 내용이 바뀜
  [ 186, 1674,  479, 1, 1, 1],   // #19 한 박자 멈춤
  [ 344, 1516,  479, 1, 1, 1],   // #20
  [ 473, 1387,  479, 1, 1, 1],   // #21
  [ 570, 1290,  479, 1, 1, 1],   // #22
  [ 729, 1131,  479, 1, 1, 1],   // #23
  [ 857, 1003,  479, 1, 1, 1],   // #24
  [ 971,  889,  479, 1, 1, 1],   // #25
  [1108,  752,  479, 1, 1, 1],   // #26
  [1273,  587,  479, 1, 1, 1],   // #27 2단으로 좁혀져 멈춤
];
const BODY_FROM = 0, BODY_TO = 7;   // FRAMES 의 이 구간(처음 → 끝, 퇴장 전체) 동안 BODY 26프레임이 흐른다
const H_SEQ = 479;                  // BODY 표의 시퀀스 높이 (Figma, 1920×1080 기준). 실제로는 seqH 로 바꿔 씀
let seqH = H_SEQ;                   // 시퀀스 중 글상자 높이 = 격자 가운데 가로선(480) 바로 위. 화면 높이에 따라 격자가 늘고 줄면 같이 (1080 에선 479)

function easeFn(name) {
  const m = /cubic-bezier\(([^)]+)\)/.exec(getComputedStyle(stage).getPropertyValue(name));
  return m ? bezier(...m[1].split(",").map(Number)) : bezier(0.5, 0, 0.5, 1);
}
const lerp = (a, b, t) => a + (b - a) * t;

/* ── BODY 프레임 사이를 각지지 않게 잇는 곡선 (Fritsch–Carlson 단조 3차 에르미트) ──
 *  Figma 프레임의 폭 변화량이 43~158px 로 들쭉날쭉해서, 직선으로 이으면 프레임을 지날 때마다 속도가 꺾인다
 *  (경계 24곳 중 12곳이 30px 이상, 최대 158px). 프레임 값은 그대로 지나가되 사이를 3차 곡선으로 이어 속도까지 매끄럽게 한다.
 *  단조 조건이 있어 프레임 값 밖으로 튀지 않는다 — 폭이 줄다 말고 더 좁아졌다 돌아오는 일이 없음.
 *  FRAMES(글자·라벨·노트북)는 그대로 직선이다. 본문 트랙에만 건다. */
function curve(y) {
  const n = y.length, d = [], m = new Array(n);
  for (let i = 0; i < n - 1; i++) d[i] = y[i + 1] - y[i];
  m[0] = d[0]; m[n - 1] = d[n - 2];
  for (let i = 1; i < n - 1; i++) m[i] = (d[i - 1] + d[i]) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) { m[i] = m[i + 1] = 0; continue; }     // 값이 그대로인 구간은 평평하게 (안 그러면 없던 움직임이 생김)
    const a = m[i] / d[i], b = m[i + 1] / d[i], ss = a * a + b * b;
    if (ss > 9) { const k = 3 / Math.sqrt(ss); m[i] = k * a * d[i]; m[i + 1] = k * b * d[i]; }
  }
  return (i, t) => {                                        // 구간 i 안의 t(0~1) — 프레임 간격이 1 이라 h 항 생략
    const t2 = t * t, t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * y[i] + (t3 - 2 * t2 + t) * m[i]
         + (-2 * t3 + 3 * t2) * y[i + 1] + (t3 - t2) * m[i + 1];
  };
}
// BODY 의 여섯 칸(left · width · height · lastAlign · text · fill)마다 곡선 하나. height 의 null 은 격자 전체 높이라 fullH 를 안 뒤에 짓는다
let BC = null;
function buildBodyCurves() { BC = [0, 1, 2, 3, 4, 5].map((k) => curve(BODY.map((f) => (k === 2 ? (f[2] == null ? fullH : f[2] === H_SEQ ? seqH : f[2]) : f[k])))); }

/* ── 본문 조판 (Pretext) ──
 *  폭이 585 → 1799 → 587 로 세 배씩 변해서, 매 프레임 줄을 다시 나누면 이웃 프레임 사이에서도 단어의 58% 가
 *  줄을 갈아탄다 — 단어를 새 자리로 옮기는 방식으로는 한 프레임에 1600px 씩 날아가서 드드득거린다.
 *  그래서 **줄 구조(어디서 줄이 바뀌는가)는 한 구간 안에서 고정**하고, 상자가 넓어지는 건 양끝맞춤이 벌어지며 따라가게 한다.
 *  구간 안에서 단어는 천천히 벌어지기만 할 뿐 줄을 건너지 않는다. 줄 구조가 갈리는 건 구간 끝 짧은 페이드(--s1wrap)에서만.
 *  그래서 한 벌이 두 층(pair)이다 — 갈아끼우는 동안만 두 조판을 겹친다. */
const FONT = "500 18px Pretendard, Archivo, 'Gothic A1', sans-serif", LH = 26, LS = -0.36;   // stage1.css #s1body 와 같아야 함
function typeset(text, mode) {   // mode: 'word' = 띄어쓰기에서만 줄바꿈 · 'char' = 글자 사이에서 줄바꿈(띄어쓰기 없는 글)
  const units = mode === 'word' ? text.trim().replace(/\s+/g, ' ').split(' ') : [...text];
  const prepared = prepareWithSegments(mode === 'word' ? units.join(' ') : text, FONT,
                                       { wordBreak: mode === 'word' ? 'keep-all' : 'normal', letterSpacing: LS });
  const c = document.createElement('canvas').getContext('2d');
  c.font = FONT; const hasLS = 'letterSpacing' in c;
  if (hasLS) c.letterSpacing = LS + 'px';
  const mw = (s) => c.measureText(s).width + (hasLS ? 0 : LS * s.length);
  const uw = units.map(mw), gap = mode === 'word' ? mw(' ') : 0;

  const mk = () => {                                          // 층 하나 = 조판 하나를 담는 곳
    const el = document.createElement('span');
    el.className = 'ts';               // .layer 는 base.css 의 화면 층(배경색 있음)과 겹쳐 격자를 덮으므로 다른 이름
    el.append(...units.map((u) => { const e = document.createElement('span'); e.textContent = u; return e; }));
    const els = [...el.children];
    for (const e of els) e.style.display = 'none';
    return { el, els, shown: 0, key: '' };
  };
  const pair = [mk(), mk()];

  const cache = new Map();
  function linesFor(width) {                                  // 폭(정수) → [{ i0, n }] 줄마다 시작 단위와 개수
    const key = Math.max(1, Math.round(width));
    let L = cache.get(key);
    if (L) return L;
    L = []; let ui = 0;
    for (const ln of layoutWithLines(prepared, key, LH).lines) {
      let n;
      if (mode === 'word') { const s = ln.text.trim(); n = s ? s.split(' ').filter(Boolean).length : 0; }
      else {
        // 글자 단위: 띄어쓰기도 단위 하나라 세야 한다(안 세면 줄마다 한두 글자씩 밀려 끝에 남은 글자가 한 줄에 펼쳐짐).
        // 줄 앞의 띄어쓰기는 앞 줄 끝에 붙이고, 이 줄 뒤에 이어지는 띄어쓰기도 이 줄 끝에 붙인다
        let lead = 0; while (units[ui + lead] === ' ') lead++;
        if (lead && L.length) { L[L.length - 1].n += lead; ui += lead; lead = 0; }   // 맨 첫 줄이면 그대로 이 줄 앞에 둠(단위를 빠뜨리지 않게)
        n = lead + [...ln.text.replace(/^\s+/, '').replace(/\s+$/, '')].length;
        while (units[ui + n] === ' ') n++;
      }
      if (n > 0) { L.push({ i0: ui, n }); ui += n; }
    }
    if (ui < units.length) L.push({ i0: ui, n: units.length - ui });   // 혹시 남으면 마지막 줄에
    cache.set(key, L);
    return L;
  }
  // 높이 h 안에 들어가는 줄까지의 단위 개수. extra 는 창 밖으로 더 내보낼 줄 수 —
  // 2 면 창 아래끝에 걸치는 줄이 양끝맞춤인 채로 잘려서 단이 끝까지 꽉 차 보인다(들쭉날쭉한 마지막 줄은 창 밖으로)
  function fitCount(width, h, extra = 0) {
    const L = linesFor(width), k = Math.max(1, Math.floor((h > 0 ? h : 0) / LH) + extra);
    return k < L.length ? L[k].i0 : units.length;             // k 가 NaN 이어도(높이를 아직 못 잼) 전부로 떨어지게
  }
  // 줄 구조는 structW 에서 잡고, 자리는 boxW 에 맞춰 편다 — 구조를 고정한 채 폭만 늘리려고 둘을 나눴다
  function place(P, structW, boxW, lastAlign, nVis) {
    nVis = Math.max(0, Math.min(units.length, Math.round(nVis)));
    const key = Math.round(structW) + '|' + Math.round(boxW) + '|' + lastAlign.toFixed(3) + '|' + nVis;
    if (key === P.key) return;                                // 값이 그대로면 다시 안 찍음
    P.key = key;
    const S = linesFor(structW);
    let li = 0, i = 0;
    const inked = (i0, n) => { while (n > 0 && units[i0 + n - 1] === ' ') n--; return n; };   // 줄 끝 띄어쓰기는 폭 계산에서 뺌(오른끝이 맞게)
    for (; li < S.length && S[li].i0 + S[li].n < nVis; li++) {          // 중간 줄 — 남는 폭을 단위 사이에 흘림
      const { i0, n } = S[li], m = inked(i0, n);
      let sum = 0; for (let k = 0; k < m; k++) sum += uw[i0 + k];
      const extra = m > 1 ? Math.max(0, boxW - sum - gap * (m - 1)) / (m - 1) : 0;
      let x = 0; const y = li * LH;
      for (let k = 0; k < n; k++, i++) { P.els[i].style.transform = 'translate(' + x.toFixed(1) + 'px,' + y + 'px)'; x += uw[i] + gap + extra; }
    }
    if (li < S.length && i < nVis) {                                    // 마지막 줄 — 늘리지 않고 통째로 좌/우
      const { i0 } = S[li], n = Math.min(nVis, i0 + S[li].n) - i0, m = inked(i0, n);
      let sum = gap * Math.max(0, m - 1); for (let k = 0; k < m; k++) sum += uw[i0 + k];
      let x = Math.max(0, boxW - sum) * lastAlign; const y = li * LH;
      for (let k = 0; k < n; k++, i++) { P.els[i].style.transform = 'translate(' + x.toFixed(1) + 'px,' + y + 'px)'; x += uw[i] + gap; }
    }
    for (let k = P.shown; k < nVis; k++) P.els[k].style.display = '';    // 보이는 개수가 바뀐 만큼만 토글
    for (let k = nVis; k < P.shown; k++) P.els[k].style.display = 'none';
    P.shown = nVis;
  }
  // 줄마다 비어 있는 구간들(rows[줄] = [[x0, x1], …], 창 기준)에 글을 차례로 흘려 넣는다 — 첫 화면에서 KIM(YUJIN) 을 피해 흐르게.
  // Pretext layoutNextLine 으로 구간 폭마다 한 줄씩. 단어가 구간보다 길어 잘리면 그 구간은 비우고 다음 구간으로
  function flow(rows) {
    const segs = []; let cur = { segmentIndex: 0, graphemeIndex: 0 }, ui = 0;
    for (let li = 0; li < rows.length && ui < units.length; li++) {
      for (const [a, b] of rows[li]) {
        const ln = layoutNextLine(prepared, cur, b - a);
        if (!ln) break;
        if (ln.end.graphemeIndex !== 0) continue;             // 단어 중간에서 끊김 = 구간이 단어보다 좁음
        const s = ln.text.trim();
        const n = mode === 'word' ? (s ? s.split(' ').filter(Boolean).length : 0) : [...s].length;
        if (!n) continue;
        segs.push({ i0: ui, n, x: a, w: b - a, y: li * LH });
        ui += n; cur = ln.end;
      }
    }
    return { segs, count: ui };
  }
  function showFlow(F, nVis) {                                // 구간마다 양끝맞춤 (마지막 구간만 왼끝). 매 프레임 불려도 되게 키 없이 바로 찍음
    const P = pair[0];
    nVis = Math.max(0, Math.min(F.count, Math.round(nVis)));
    P.key = '';                                               // 다음에 place() 가 오면 다시 찍게
    let i = 0;
    F.segs.forEach(({ i0, n, x, w, y }, si) => {
      if (i >= nVis) return;
      let sum = 0; for (let k = 0; k < n; k++) sum += uw[i0 + k];
      let extra = n > 1 && si < F.segs.length - 1 ? Math.max(0, w - sum - gap * (n - 1)) / (n - 1) : 0;
      if (extra > 18) extra = 0;                              // 좁은 구간에 단어 두세 개면 사이가 휑하게 벌어짐 — 그땐 왼끝 정렬(글자 외곽에 붙음)
      for (let k = 0, xx = x; k < n && i < nVis; k++, i++) { P.els[i].style.transform = 'translate(' + xx.toFixed(1) + 'px,' + y + 'px)'; xx += uw[i] + gap + extra; }
    });
    for (let k = P.shown; k < nVis; k++) P.els[k].style.display = '';
    for (let k = nVis; k < P.shown; k++) P.els[k].style.display = 'none';
    P.shown = nVis;
    P.el.style.display = ''; P.el.style.opacity = 1;
    pair[1].el.style.display = 'none';
  }
  // structA → structB 로 ft(0~1) 만큼 갈아끼운 모습을, 전체 alpha 로. 구조가 같으면 겹치지 않는다
  function show(boxW, lastAlign, nVis, structA, structB, ft, alpha) {
    if (alpha <= 0) { pair[0].el.style.display = pair[1].el.style.display = 'none'; return; }
    if (Math.round(structA) === Math.round(structB)) ft = 0;
    place(pair[0], structA, boxW, lastAlign, nVis);
    pair[0].el.style.display = '';
    // 0.5/0.5 로 겹치면 한가운데서 글자 밀도가 꺼지므로 밝기 합이 일정하도록 √ 로 겹친다
    pair[0].el.style.opacity = alpha * (ft > 0 ? Math.sqrt(1 - ft) : 1);
    pair[0].el.style.pointerEvents = +pair[0].el.style.opacity < 0.5 ? 'none' : '';   // 거의 안 보이는 층이 호버를 가로채지 않게
    if (ft > 0) {
      place(pair[1], structB, boxW, lastAlign, nVis);
      pair[1].el.style.display = '';
      pair[1].el.style.opacity = alpha * Math.sqrt(ft);
      pair[1].el.style.pointerEvents = +pair[1].el.style.opacity < 0.5 ? 'none' : '';
    } else pair[1].el.style.display = 'none';
  }
  return { els: [pair[0].el, pair[1].el], count: units.length, fitCount, show, flow, showFlow };
}

let tsA = null, tsB = null, nAll = 0, nSeq = 0;
function buildBody() {                                        // 문단 → 단위 span 두 벌 (처음 한 번)
  if (tsA) return;
  tsA = typeset(DUMMY.repeat(6), 'word');                     // 여백 본문 — 띄어쓰기 단위
  tsB = typeset(DUMMY2, 'word');                              // 바뀐 글 — 단어 단위(단어마다 span 이라 호버하면 단어째 초록 배경). 띄어쓰기 없는 글로 바꾸면 'char'
  tsB.els.forEach((el) => el.classList.add('hv'));
  body.textContent = '';
  body.append(...tsA.els, ...tsB.els);
  const lay = () => { measureFill(); renderBody(pos); };
  lay();
  requestAnimationFrame(lay);   // 폰트가 레이아웃보다 먼저 오면 이 시점엔 높이가 0 이다 — 다음 프레임에 한 번 더 (measureFill 이 인라인 높이를 걷고 재므로 복구됨)
}
function measureFill() {                                      // 상자를 꽉 채우는 글 분량 — 뷰포트 높이가 바뀌면 다시
  // clientHeight 는 scale 전 값(무대 좌표) 이라 그대로 쓴다. 우리가 써둔 인라인 높이를 걷고 CSS(calc) 기준으로 재야
  // 한 번 0 이 들어간 뒤로 계속 0 으로 읽히는 일이 없다
  const keep = bodyClip.style.height;
  bodyClip.style.height = '';
  // 아직 레이아웃 전이면 clientHeight 가 0 이다 — 그땐 무대 높이에서 직접 계산 (stage1.css: 위아래 60px 여백)
  const h = bodyClip.clientHeight || (parseFloat(stage.style.height) || 0) - 120;
  bodyClip.style.height = keep;
  if (h > 0) fullH = h;
  nAll = tsA.fitCount(BODY[0][1], fullH > 0 ? fullH : 1e4, 2);   // 처음: 격자 아래선까지 꽉 — 걸치는 줄은 잘리게 두 줄 더
  seqH = fullH > 0 ? fullH * 480 / 960 - 1 : H_SEQ;             // 격자 가운데 가로선 바로 위 (fullH = 격자 높이)
  nSeq = tsA.fitCount(BODY[0][1], seqH);                         // 시퀀스: 그 높이에 온전히 들어가는 줄까지 (1080: 18줄)
  flowKey = '';                                                  // 높이가 바뀌면 흐름 조판도 다시
  const F = kimFlow();                                           // 첫 화면은 글자를 피해 흐름 — 채울 분량도 그 조판 기준
  if (F) nAll = F.count;
  buildBodyCurves();                                             // 높이 칸에 fullH 가 들어가므로 여기서 같이 짓는다
}

/* ── 첫 화면: 초록 글이 KIM(YUJIN) 외곽을 피해 흐름 — 외곽이 움직이면 글도 같이 밀려남 ──
 *  지금 글자 배치(호버 swapS · 퇴장으로 내려간 거리 nameDrop)대로, 미리 읽어 둔 글자 외곽(readMasks)을 늘려 얹어 줄(26px)마다 글자가 차지한
 *  가로 구간을 구하고 --s1flowGap 만큼 띄운 나머지 빈 구간에 글을 흘린다(Pretext layoutNextLine).
 *  --s1flowMin 보다 좁은 빈 구간(K·I·M 사이 틈)은 비우고, M 아치 안쪽처럼 넉넉한 곳은 채운다.
 *  호버로 글자가 커지고 작아지는 동안, 퇴장으로 내려가는 동안 매 프레임 다시 흘려서 단어가 외곽에 밀리고 다음 줄로 넘어간다.
 *  퇴장 휠 첫 구간(글상자가 격자 전체 → 가운데선으로 줄어드는 동안)까지만 이 조판이고, 그다음부터는 원래 사각형 조판.
 *  글자 영역 위쪽 줄은 막힌 데가 없어 사각형 조판과 줄바꿈이 똑같다 — 그래서 갈아끼워도 보이는 줄은 안 바뀐다. */
let flowKey = '', flowCache = null, nameDrop = 0;
function kimFlow() {
  if (!tsA || !letters.every((im) => im.complete && im.naturalWidth)) return null;   // 글자 그림이 아직이면 사각형 조판
  const key = swapS.toFixed(3) + '|' + nameDrop.toFixed(1) + '|' + fullH;
  if (key !== flowKey) { const rows = kimRows(); flowKey = key; flowCache = rows ? tsA.flow(rows) : null; }
  return flowCache;
}
/* 글자마다 외곽을 **한 번만** 읽어 둔다 — 행마다 잉크가 있는 가로 구간들(글자 폭·높이 대비 0~1 비율).
 * 예전엔 매 프레임 글자를 캔버스에 그려 픽셀을 전부 읽었는데, 그게 호버 한 프레임에 7ms 쯤(1920 기준) 들어서
 * 스프링이 멈칫하는 가장 큰 원인이었다. 크기가 바뀌어도 비율이라 그대로 늘려 쓰면 된다. 가장 커질 때 크기로 읽어 둠 */
let letterMasks = null;
function readMasks() {
  const cv = document.createElement('canvas'), g = cv.getContext('2d', { willReadFrequently: true });
  return letters.map((im, k) => {
    const mw = Math.ceil(Math.max(NAME_A[k][2], NAME_B[k][2])), mh = Math.ceil(Math.max(NAME_A[k][3], NAME_B[k][3]));
    cv.width = mw; cv.height = mh;
    g.drawImage(im, 0, 0, mw, mh);
    const px = g.getImageData(0, 0, mw, mh).data, rows = [];
    for (let y = 0; y < mh; y++) {
      const runs = [];                                           // [시작, 끝, 시작, 끝, …]
      for (let x = 0, o = y * mw * 4 + 3; x < mw; x++, o += 4) {
        if (px[o] <= 8) continue;
        const a = x;
        while (x < mw && px[o] > 8) { x++; o += 4; }
        runs.push(a / mw, x / mw);
      }
      rows.push(runs);
    }
    return rows;
  });
}
function kimRows() {
  const cs = getComputedStyle(stage);
  const G = parseFloat(cs.getPropertyValue('--s1flowGap')) || 10, MIN = parseFloat(cs.getPropertyValue('--s1flowMin')) || 40;
  const CX = BODY[0][0], CY = 60, CW = BODY[0][1], stH = Math.ceil(parseFloat(stage.style.height) || 0);
  if (!(stH > 0 && fullH > 0)) return null;
  const name = $('#s1name'), nTop = name.offsetTop, nBot = nTop + name.offsetHeight;   // 글자 창 — 이 밖으로 나간 부분은 안 보이므로 안 막음
  if (!letterMasks) letterMasks = readMasks();
  const placed = [];                                             // [외곽, x, y, w, h] — 본문 단 기준 좌표
  let top = nBot;
  letters.forEach((im, k) => {
    const P = NAME_A[k], Q = NAME_B[k];
    const l = lerp(P[0], Q[0], swapS), b = lerp(P[1], Q[1], swapS), w = lerp(P[2], Q[2], swapS), h = lerp(P[3], Q[3], swapS);
    const x = name.offsetLeft + l - CX, y = nBot - b - h + (k === 2 ? 0 : nameDrop);   // M 은 퇴장 때 안 내려가고 제자리에서 뒤집힘(renderWork)
    if (x > CW) return;                                          // 본문 단 오른쪽 밖 (YUJIN 대부분)
    placed.push([letterMasks[k], x, y, w, h]);
    top = Math.min(top, Math.max(nTop, y));
  });
  const yA = Math.max(0, Math.floor(top - G)), yB = Math.min(stH, nBot);
  const rows = [], n = Math.floor(fullH / LH) + 3, occ = new Uint8Array(CW);
  for (let li = 0; li < n; li++) {
    const y0 = Math.max(yA, CY + li * LH - G), y1 = Math.min(yB, CY + (li + 1) * LH + G);
    if (yB <= yA || y1 <= y0) { rows.push([[0, CW]]); continue; } // 글자 영역에 안 닿는 줄은 통째로
    occ.fill(0);
    for (const [R, x, y, w, h] of placed) {                      // 이 줄 높이에 걸친 외곽 행들의 가로 구간을 지금 크기로 늘려서 막음
      const v0 = (y0 - y) / h, v1 = (y1 - y) / h;
      if (v1 <= 0 || v0 >= 1) continue;
      const r1 = Math.min(R.length, Math.ceil(v1 * R.length));
      for (let r = Math.max(0, Math.floor(v0 * R.length)); r < r1; r++) {
        const runs = R[r];
        for (let i = 0; i < runs.length; i += 2) {
          const xa = Math.max(0, Math.round(x + runs[i] * w)), xb = Math.min(CW, Math.round(x + runs[i + 1] * w));
          if (xb > xa) occ.fill(1, xa, xb);
        }
      }
    }
    const free = []; let a = 0;                                   // 글자 구간 양옆을 G 만큼 넓혀 막고, 남은 구간 중 넉넉한 것만
    for (let x = 0; x <= CW; x++) {
      if (x < CW && !occ[x]) continue;
      const b = x === CW ? CW : x - G;
      if (b - a >= MIN) free.push([a, b]);
      while (x < CW && occ[x]) x++;
      a = x + G;
    }
    rows.push(free);
  }
  return rows;
}

let pos = 0, dir = 0, raf = 0, lastT = 0, fullH = 0, ease = null, bodyEase = null, lockUntil = 0, wrapFade = 0.35, reflow = true;   // pos: 프레임 단위 위치 0 ~ n
const N = FRAMES.length - 1;
const STOPS = [0, ...FRAMES.map((f, i) => (f.stop ? i : -1)).filter((i) => i > 0), N];   // 정지점들 (양 끝 포함)

// 본문만 — FRAMES 의 BODY_FROM~BODY_TO 구간에 BODY 26프레임을 편다.
// p 는 이징 **전** 위치다: 본문은 --s1bodyEase 로 따로 이징한다(양끝 더 느리게, 가운데 더 빠르게).
// KIM YUJIN·2026 PORTFOLIO·노트북은 --s1stepEase 를 그대로 쓰므로 서로 영향이 없다.
function renderBody(p) {
  if (!tsA || !BC) return;
  const u01 = Math.min(1, Math.max(0, (p - BODY_FROM) / (BODY_TO - BODY_FROM)));
  const u = (bodyEase ? bodyEase(u01) : u01) * (BODY.length - 1);
  const i = Math.min(BODY.length - 2, Math.floor(u)), t = u - i;
  const A = BODY[i], B = BODY[i + 1];
  const cl = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);            // 0~1 칸은 부동소수 오차로 넘지 않게
  const x = BC[0](i, t), w = BC[1](i, t);
  const lastAlign = cl(BC[3](i, t)), mix = cl(BC[4](i, t)), nVis = lerp(nAll, nSeq, cl(BC[5](i, t)));
  bodyClip.style.left = x + 'px'; bodyClip.style.width = w + 'px';
  // 높이를 아직 못 쟀는데 격자 전체 높이(null)가 섞인 구간이면 인라인을 비워 CSS(calc)에 맡긴다 — 0px 을 써넣어 본문이 통째로 사라지는 걸 막는다
  bodyClip.style.height = fullH > 0 || (A[2] != null && B[2] != null) ? BC[2](i, t) + 'px' : '';
  body.style.width = w + 'px';
  // --s1reflow 1(기본): 매 프레임 지금 폭으로 다시 조판 — 단어가 폭을 따라 밀리고, 모자라면 다음 줄로 넘어감(페이드 없음).
  // 0: 예전 방식 — 구간 안에선 줄 구조를 고정한 채 폭만 벌어지고, 끝 wrapFade 만큼에서 다음 구조로 겹쳐 페이드
  const ft = reflow ? 0 : t <= 1 - wrapFade ? 0 : (t - (1 - wrapFade)) / wrapFade;
  const sA = reflow ? w : A[1], sB = reflow ? w : B[1];
  const F = i === 0 ? kimFlow() : null;                      // 첫 구간(폭 585 그대로)까지는 글자를 피해 흐르는 조판 — 글자가 움직이면 매 프레임 다시 흘림
  if (F) tsA.showFlow(F, lerp(F.count, nSeq, cl(BC[5](i, t))));
  else tsA.show(w, lastAlign, nVis, sA, sB, ft, mix >= 1 ? 0 : mix > 0 ? Math.sqrt(1 - mix) : 1);
  tsB.show(w, lastAlign, tsB.count, sA, sB, ft, mix <= 0 ? 0 : mix < 1 ? Math.sqrt(mix) : 1);
}
// 네모박스(box.js)가 본문을 밀 때 — 퇴장 끝 상태(바뀐 글, 마지막 줄 오른끝)를 왼끝·높이만 바꿔 다시 조판. 오른끝은 격자 오른선 1860
function squeezeBody(left, h) {
  if (!tsB) return;
  const w = Math.max(0, 1860 - left);
  bodyClip.style.left = left + 'px'; bodyClip.style.width = w + 'px'; bodyClip.style.height = Math.max(0, h) + 'px';
  body.style.width = w + 'px';
  tsB.show(w, 1, tsB.count, w, w, 0, w > 0 ? 1 : 0);
}
function render(q) {                                        // q: --s1stepEase 가 적용된 위치(프레임 단위) → 프레임 사이 보간. 본문은 renderBody 가 따로 그린다
  q = Math.min(N, Math.max(0, q));
  const i = Math.min(N - 1, Math.floor(q)), t = q - i;
  const A = FRAMES[i], B = FRAMES[i + 1];
  year.style.transform = "translateY(" + (-lerp(A.year, B.year, t)) + "px)";
  laptop.style.bottom = lerp(A.laptop, B.laptop, t) + swapS * SWAP_LIFT + "px";
  const ny = lerp(A.name, B.name, t);
  nameDrop = ny;
  letters.forEach((e, k) => {                               // 글자: 호버 배치(KIM↔YUJIN) + 아래로 내려간 거리
    if (Math.abs(swapS) > 1e-4) {                           // 스프링이 0 밑으로도 잠깐 내려가므로 절댓값으로 (0 일 때만 CSS 기본값)
      const P = NAME_A[k], Q = NAME_B[k];
      e.style.left = lerp(P[0], Q[0], swapS) + "px"; e.style.bottom = lerp(P[1], Q[1], swapS) + "px";
      e.style.width = lerp(P[2], Q[2], swapS) + "px"; e.style.height = lerp(P[3], Q[3], swapS) + "px";
    } else e.style.left = e.style.bottom = e.style.width = e.style.height = "";   // KIM 크게 = CSS 그대로
    e.style.transform = "translateY(" + ny + "px)";
  });
  renderWork(q);                                            // M → W (WORK)
  syncGlass();                                              // U 에 걸린 유리 링을 같은 프레임에 맞춤 (glass.js)
  syncBits();                                               // J 위 유리 큐브도 (glassBits.js)
}

/* ── WORK (임시 연출, 2026-09-24 피드백 "M 이 W 로 뒤집힘") — 퇴장 진행도 p(0~1)에 묶여 있어 휠을 올리면 그대로 되감긴다 ──
 *  ① WORK_FLIP: 다른 글자가 내려가는 동안 M 은 제자리에서 위아래로 뒤집혀(rotateX 180°) W 가 됨
 *  ② WORK_MOVE: 왼쪽 위 첫 칸(격자 모서리에서 WORK_PAD 안쪽, 높이 = 첫 칸 − 위아래 여백)으로 줄어들며 옮겨 붙음
 *  ③ WORK_ORK: 그 오른쪽에 O · R · K 가 하나씩 톡 (페이드 없음). 대문자 높이 = W 높이
 *  진짜 M(#s1name 안)은 창에 잘리므로 퇴장이 시작되면 숨기고, 같은 그림의 W(#s1work)가 M 의 지금 자리(호버 배치 반영)에서 이어받는다.
 *  화면3 전까지 남는다. 다만 마지막 휠에 ABOUT ME 가 들어오면 왼쪽 위에서 겹쳐서 일단 숨김 — W 가 다시 M 이 되는 건 화면3 작업 때 */
const WORK_FLIP = [0, 0.3], WORK_MOVE = [0.42, 0.82], WORK_ORK = [0.84, 0.96], WORK_PAD = 20;
const work = $('#s1work'), workW = work.querySelector('.w'), workL = [...work.querySelectorAll('span')];
let orkM = null;                                            // O·R·K 글꼴 치수(글자 크기 대비) — 대문자 높이 · 글자 상자 윗변에서 대문자 윗변까지
function orkMetrics() {
  const g = document.createElement('canvas').getContext('2d'), cs = getComputedStyle(workL[0]);
  g.font = cs.fontWeight + ' 100px ' + cs.fontFamily;
  const m = g.measureText('ORK'), cap = m.actualBoundingBoxAscent / 100;
  const asc = m.fontBoundingBoxAscent / 100, desc = m.fontBoundingBoxDescent / 100;
  return { cap, top: (1 - (asc + desc)) / 2 + asc - cap };   // line-height 1 기준
}
const seg = (p, [a, b]) => Math.min(1, Math.max(0, (p - a) / (b - a)));
const smooth = (x) => x * x * (3 - 2 * x);
function renderWork(q) {
  const p = q / N, on = p > 0 && !(aboutShown() || gridMorphed());
  work.classList.toggle('on', on);
  letters[2].style.visibility = p > 0 ? 'hidden' : '';
  if (!on) return;
  const nm = $('#s1name'), P = NAME_A[2], Q = NAME_B[2];      // 출발 = M 의 지금 자리 (무대 좌표)
  const hw = lerp(P[2], Q[2], swapS), hh = lerp(P[3], Q[3], swapS);
  const hx = nm.offsetLeft + lerp(P[0], Q[0], swapS), hy = nm.offsetTop + nm.offsetHeight - lerp(P[1], Q[1], swapS) - hh;
  const sy = Math.max(1, (parseFloat(stage.style.height) || 1080) - 120) / 960;   // 격자 세로 배율 — 첫 가로선은 격자 237
  const th = 237 * sy - 2 * WORK_PAD, tw = th * hw / hh, tx = 60 + WORK_PAD, ty = 60 + WORK_PAD;   // 도착 = 왼쪽 위 첫 칸
  const m = smooth(seg(p, WORK_MOVE));
  workW.style.left = lerp(hx, tx, m) + 'px'; workW.style.top = lerp(hy, ty, m) + 'px';
  workW.style.width = lerp(hw, tw, m) + 'px'; workW.style.height = lerp(hh, th, m) + 'px';
  workW.style.transform = 'rotateX(' + 180 * smooth(seg(p, WORK_FLIP)) + 'deg)';
  if (!orkM) orkM = orkMetrics();
  const fs = th / orkM.cap, gap = th * 0.16;
  let lx = tx + tw + gap;
  workL.forEach((el, i) => {
    el.style.fontSize = fs + 'px'; el.style.left = lx + 'px'; el.style.top = ty - fs * orkM.top + 'px';
    lx += el.offsetWidth + gap;
    el.classList.toggle('on', p >= lerp(WORK_ORK[0], WORK_ORK[1], i / (workL.length - 1)));
  });
}

/* ── 호버 배치 — swapS: 0 = KIM 크게, 1 = YUJIN 크게. 휠 시퀀스와 따로 굴러서, 퇴장 중에 KIM 크게로 돌아가는 것도 겹쳐 그린다 ──
 *  이징이 아니라 **스프링**이다 (네모박스를 놓았을 때와 같은 식, box.js springAt) — 목표를 한 번 살짝 지나쳤다 돌아와서 "또잉" 한다.
 *  그래서 swapS 는 0~1 을 넘나든다: 1 을 넘으면 YUJIN 크게보다 조금 더 커졌다 돌아오고, 0 밑으로 내려가면 KIM 쪽으로 그만큼.
 *  --s1swap 은 가라앉는 데 걸리는 시간, --s1swapDamp 는 넘치는 정도(1 = 안 넘침, 낮을수록 많이 넘침) */
let swapS = 0, swapTo = 0, swapFrom = 0, swapRaf = 0, swapT0 = 0, swapDamp = 0.6, swapFreq = 9.5;
function swapSpring(ms) {                                    // 1 → 0 (처음 속도 0). damp < 1 이면 0 을 한 번 지나쳤다 돌아옴
  const x = ms / 1000, om = swapFreq, z = swapDamp;
  if (z >= 1) return (1 + om * x) * Math.exp(-om * x);
  const od = om * Math.sqrt(1 - z * z);
  return Math.exp(-z * om * x) * (Math.cos(od * x) + (z * om / od) * Math.sin(od * x));
}
function swapTick(now) {
  const f = swapSpring(now - swapT0);
  swapS = swapTo + (swapFrom - swapTo) * f;
  const done = now - swapT0 > 200 && Math.abs(f) < 1e-3;
  if (done) swapS = swapTo;
  if (!raf) { render(eased(pos)); renderBody(pos); }         // 휠 시퀀스가 돌고 있으면 그쪽 tick 이 같이 그림
  swapRaf = done ? 0 : requestAnimationFrame(swapTick);
}
const swapDampCss = () => Math.min(1, Math.max(0.05, parseFloat(getComputedStyle(stage).getPropertyValue('--s1swapDamp')) || 0.6));
// 호버 스프링에서 U 가 가장 커질 폭(디자인 px) — 출발 폭, 또는 목표 폭 + 넘치는 만큼(처음 속도 0 인 감쇠 스프링의 최대 넘침 비율).
// 유리 링 캔버스를 처음부터 이 크기로 잡아 두게 glass.js 에 알려 준다 (reserveGlass)
function swapPeakU(from, to, z) {
  const ov = z < 1 ? Math.exp(-Math.PI * z / Math.sqrt(1 - z * z)) : 0;
  const uw = (x) => lerp(NAME_A[4][2], NAME_B[4][2], x), a = uw(from), b = uw(to);
  return Math.max(a, b + Math.max(0, b - a) * ov);
}
function setSwap(v) {
  if (swapTo === v) return;
  swapDamp = swapDampCss();
  const T = Math.max(0.05, parseFloat(getComputedStyle(stage).getPropertyValue('--s1swap')) || 0.7);
  swapFreq = 4 / (swapDamp * T);                             // 가라앉는 시간 T 에서 거꾸로 뽑음 (4 / (z·ω) ≈ 정착 시간)
  swapFrom = swapS; swapTo = v; swapT0 = performance.now();  // 돌아오는 중에 다시 올리면 그 자리에서 이어서
  // 넘치는 도중에 반대로 틀면 한 번 튕길 때보다 조금 더 벌어질 수 있어서 그것까지
  reserveGlass(Math.max(swapPeakU(0, 1, swapDamp), swapPeakU(swapFrom, v, swapDamp)));
  if (!swapRaf) swapRaf = requestAnimationFrame(swapTick);
}
function clear() {                                          // 위치 0 — 인라인 지우고 CSS 값으로
  scrollHint(true); scrollBar(false);                       // 첫 화면으로 돌아왔으면 막대가 다시 글자로 펴진다
  bodyClip.style.left = bodyClip.style.width = bodyClip.style.height = "";
  body.style.width = ""; year.style.transform = ""; laptop.style.bottom = "";
  for (const e of letters) e.style.transform = "";
  syncGlass(); syncBits();
  renderWork(0);                                              // M 다시 보이게
  renderBody(0);
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
  pos += dir * dt / ms * (jumpTo >= 0 ? JUMP_EXIT * tempo.k : 1);    // 섹션 이동 중이면 빨리
  // 정지점: 진행 방향으로 처음 만나는 정지점을 넘으면 거기서 멈춤
  const stop = dir > 0 ? STOPS.find((st) => st > before && st <= pos) : [...STOPS].reverse().find((st) => st < before && st >= pos);
  if (stop !== undefined) { pos = stop; dir = 0; lockUntil = now + 400 / tempo.k; }   // 같은 휠 동작이 정지점을 뚫지 않게 잠깐 잠금
  render(eased(pos));                                                 // 글자·라벨·노트북 (--s1stepEase)
  renderBody(pos);                                                    // 본문 (이징 전 위치 — 안에서 --s1bodyEase 를 건다)
  paintScroll();                                                      // 아래 여백 막대
  if (dir === 0 && pos === 0) clear();
  raf = dir ? requestAnimationFrame(tick) : 0;
}
const atStart = () => pos === 0 && dir === 0;
function play(d) {
  if (d > 0) scrollBar(true);                               // 굴리기 시작하면 글자가 눌려 막대가 됨
  if (dir === 0 && performance.now() < lockUntil) return;
  if (dir === 0 && pos >= N && (d > 0 || boxShown())) {       // 퇴장이 끝난 뒤 — 2번째 휠 네모박스 등장 · 3번째 휠 박스와 초록 글 사라짐 · 4번째 휠 격자 가로줄 갈아끼우기(box.js) · 5번째 휠 ABOUT ME(about.js).
                                                             // 휠을 올리면 한 단계씩 되돌아가고, 다 되돌아간 뒤 그다음 휠에 퇴장이 되감김
    // 마지막 휠은 격자 가로줄 갈아끼우기와 ABOUT ME 를 **같이** 돌린다 — 둘을 따로 두면 선만 바뀌는 빈 구간이 생겨서
    const ms = d > 0 ? (!boxShown() ? showBox() : !boxCleared() ? clearBox() : Math.max(morphGrid(), showAbout()))
                     : (cvShown() ? closeCv() : aboutShown() || gridMorphed() ? Math.max(hideAbout(), unmorphGrid()) : boxCleared() ? unclearBox() : hideBox());
    if (ms) { const t = ms / tempo.k; lockUntil = performance.now() + t + 300 / tempo.k; followBar(t); }   // 같은 휠 동작(관성)이 이어서 되감기지 않게. ms 는 평소 빠르기 기준이라 섹션 이동 중엔 나눔
    return;
  }
  if ((d > 0 && pos >= N) || (d < 0 && pos <= 0)) return;
  buildBody();
  if (atStart()) {                                          // 출발할 때 한 번 잼
    setSwap(0);                                             // YUJIN 크게였으면 KIM 크게로 돌아가며 퇴장
    measureFill();
    ease = easeFn('--s1stepEase');                          // 글자·라벨·노트북
    bodyEase = easeFn('--s1bodyEase');                      // 초록 본문 — 양끝 더 느리게, 가운데 더 빠르게
    const f = parseFloat(getComputedStyle(stage).getPropertyValue('--s1wrap'));   // 구간 중 줄 구조를 갈아끼우는 비율
    wrapFade = Math.min(0.9, Math.max(0.05, isNaN(f) ? 0.35 : f));
    const rf = parseFloat(getComputedStyle(stage).getPropertyValue('--s1reflow'));
    reflow = isNaN(rf) ? true : rf >= 0.5;
  }
  dir = d;
  if (!raf) { lastT = performance.now(); raf = requestAnimationFrame(tick); }
}
/* ── 섹션 이동 — 스크롤 막대 위 이름(#s1nav)을 누르면 그 섹션까지 휠을 대신 한 단계씩 굴린다 ──
 *  단계: 0 첫 화면 · 1 퇴장 끝 · 2 네모박스(WORK) · 3 박스·글 사라짐 · 4 ABOUT ME. 앞 단계가 끝나 잠금(lockUntil)이 풀리면 다음 단계.
 *  가는 동안엔 전부 JUMP_TEMPO 배로 빨리 돈다(tempo — box.js · about.js 연출과 단계 사이 잠금까지). 제일 긴 KIM YUJIN 퇴장은 거기에 JUMP_EXIT 배를 더.
 *  처음부터 ABOUT ME 까지 JUMP_TEMPO 1 이면 약 9초, 1.5 면 약 6초 (2026-09-24 "너무 느리다" → 1.5).
 *  사용자가 휠·키·터치를 쓰면 그 자리에서 멈추고 평소 빠르기로(userPlay) */
const JUMP_TEMPO = 1.5, JUMP_EXIT = 2;
let jumpTo = -1;
const stepNow = () => pos < N ? 0 : !boxShown() ? 1 : !boxCleared() ? 2 : !(aboutShown() || gridMorphed()) ? 3 : 4;
function jumpTick() {
  if (jumpTo < 0) return;
  const cur = stepNow();
  if (cur === jumpTo && !dir && performance.now() >= lockUntil) { jumpTo = -1; tempo.k = 1; paintScroll(); return; }   // 마지막 단계 연출이 끝날 때까지 빠르기 유지
  if (!dir && performance.now() >= lockUntil) play(jumpTo > cur ? 1 : -1);   // ABOUT ME 에서 이력이 열려 있으면 뒤로 첫 단계는 이력 닫기
  requestAnimationFrame(jumpTick);
}
function jump(step) {
  const idle = jumpTo < 0;
  jumpTo = step; tempo.k = JUMP_TEMPO;
  paintScroll();
  if (idle) requestAnimationFrame(jumpTick);
}
function userPlay(d) { jumpTo = -1; tempo.k = 1; play(d); }              // 휠·키·터치 — 섹션 이동 중이었으면 거기서 멈추고 사용자 손을 따름
const LINE = 26, LINE_MS = 38;   // 본문 행간(px) · 한 줄 드러나는 간격(ms)
export function initStage1() {
  body.textContent = DUMMY.repeat(6);                         // 폰트 오기 전엔 문단 그대로
  initBox(squeezeBody);
  initAbout();                                                // ABOUT ME 클릭 → 이력 (about.js)
  reserveGlass(swapPeakU(0, 1, swapDampCss()));               // 유리 링 캔버스를 YUJIN 크게 + 튕김 크기로 미리 — 첫 호버에서 새로 잡느라 멈칫하지 않게
  sizing();
  const ready = document.fonts ? document.fonts.load(FONT).then(() => document.fonts.ready) : Promise.resolve();
  ready.then(buildBody);
  if (document.fonts) document.fonts.load("500 100px 'Chillax'").then(() => { orkM = null; }, () => {});   // WORK 의 O·R·K 글꼴 — 미리 받아 두고, 오면 치수 다시 잼
  // KIM 글자 그림이 다 오면 피해 흐르는 조판으로 다시 (그 전엔 사각형 조판)
  Promise.all(letters.map((im) => (im.decode ? im.decode() : Promise.resolve()).catch(() => {})))
    .then(() => ready).then(() => { if (tsA && pos === 0) { measureFill(); renderBody(pos); } });
  const cs1 = getComputedStyle($('#s1'));
  const waitMs = (parseFloat(cs1.getPropertyValue('--s1scrollWait')) || 0.6) * 1000;
  hintUpAt = performance.now() + waitMs + (parseFloat(cs1.getPropertyValue('--s1scrollIn')) || 0.7) * 1000;
  setTimeout(() => scrollHint(true), waitMs);
  setTimeout(() => {                                          // 본문 한 줄씩 드러내기
    const n = Math.max(1, Math.floor(bodyClip.clientHeight / LINE));
    body.style.transition = 'clip-path ' + (n * LINE_MS) + 'ms steps(' + n + ', end)';
    body.style.clipPath = 'inset(0 0 0 0)';
    setTimeout(() => { body.style.transition = ''; }, n * LINE_MS + 50);   // 끝나면 시퀀스용 transition 으로 복귀
  }, 150);
  // 호버 — KIM 글자에 올리면 KIM 크게, YUJIN 글자에 올리면 YUJIN 크게 (첫 화면에서만)
  letters.forEach((im, k) => im.addEventListener('pointerenter', () => { if (atStart()) setSwap(k < 3 ? 0 : 1); }));
  // 휠 — 캡처 단계에서 받아서 어떤 요소 위에 있든 잡음. deltaMode 가 줄/페이지 단위인 환경(Firefox 등)도 방향만 보면 되므로 그대로
  window.addEventListener('wheel', (e) => { if (e.deltaY !== 0) userPlay(e.deltaY > 0 ? 1 : -1); }, { passive: true, capture: true });
  // 키보드 — ↓/PageDown/Space 앞으로, ↑/PageUp 뒤로. 섹션 이름 버튼에서 누른 Space 는 버튼 몫
  document.addEventListener('keydown', (e) => {
    if (e.target.closest && e.target.closest('#s1nav')) return;
    if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ') userPlay(1);
    else if (e.key === 'ArrowUp' || e.key === 'PageUp') userPlay(-1);
  });
  // 터치 — 세로 스와이프
  let ty = null;
  document.addEventListener('touchstart', (e) => { ty = e.touches[0].clientY; }, { passive: true });
  document.addEventListener('touchmove', (e) => { if (ty == null) return; const d = ty - e.touches[0].clientY; if (Math.abs(d) > 24) { userPlay(d > 0 ? 1 : -1); ty = null; } }, { passive: true });
  // 섹션 이동 — 막대 위 이름
  navBtns.forEach((b) => b.addEventListener('click', () => jump(+b.dataset.step)));
}
