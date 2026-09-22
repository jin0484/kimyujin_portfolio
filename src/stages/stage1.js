/* ═══════════ STAGE 1 — Figma "#1" 프레임 (1920 기준) ═══════════
 *
 * 격자(SVG) + 왼쪽 2단을 채운 본문(메인 컬러) + 하단 거대 KIM YUJIN(글자 하나하나 SVG) + 노트북.
 * 무대(#s1stage)는 폭 1920 고정, 화면 폭에 맞춰 scale. 높이는 뷰포트 높이 ÷ scale 로 잡아
 * 격자·본문은 위아래로 늘어나고 KIM YUJIN 은 바닥에 붙는다.
 * 좌표·크기는 Figma 값 그대로 (src/styles/stage1.css). 본문 글은 data.js 의 DUMMY · DUMMY2.
 * 본문: 처음 들어올 때 위에서 아래로 한 줄씩 드러남 (clip-path 를 줄 수만큼의 steps 로 내림).
 * 휠: 첫 휠에 KIM↔YUJIN 스왑(#2 프레임)까지 가서 멈추고, 다음 휠에 되돌아와 멈추고, 세 번째 휠에 퇴장 시퀀스.
 *
 * 트랙이 둘 — 둘 다 같은 위치(pos)를 보지만 표는 따로다:
 *   FRAMES : KIM YUJIN · 2026 PORTFOLIO · 노트북   (화면1.pdf, 10프레임)
 *   BODY   : 초록 작은 글자                        (Figma "초록 작은 글자 모션" 섹션 120:1010, 26프레임)
 * 본문 프레임이 훨씬 촘촘해서 한 표에 못 담는다. 나눠두면 한쪽을 고쳐도 다른 쪽 타이밍이 안 흔들린다.
 */
import { prepareWithSegments, layoutWithLines } from '@chenglou/pretext';
import { DUMMY, DUMMY2 } from '../data.js';
import { $ } from '../utils.js';

const stage = $('#s1stage'), body = $('#s1body'), bodyClip = $('#s1bodyclip'),
      year = $('#s1year'), laptop = $('#s1laptop'), letters = [...stage.querySelectorAll('#s1name img')];
const DW = 1920;

export function sizing() {
  const s = window.innerWidth / DW;
  stage.style.height = (window.innerHeight / s) + 'px';
  stage.style.transform = 'scale(' + s + ')';
}

export function refresh() {                                   // 리사이즈 · 폰트 로드 후 (main.js)
  sizing();
  if (tsA) { measureFill(); renderBody(pos); }                // 높이가 달라지면 채울 글 분량도 다시
}

/* ── 휠 시퀀스 — 화면1.pdf (값은 PDF 에서 그대로 읽음, 1920×1080 기준) ──
 *  name: KIM YUJIN 이 아래로 내려간 거리(px, 378 이상이면 창 밖)   year: 2026 PORTFOLIO 가 창 안에서 올라간 거리(px, 25 이상이면 창 밖)
 *  laptop: bottom   swap: KIM↔YUJIN 배치 (0 = KIM 크게, 1 = YUJIN 크게)
 *  stop: 여기서 멈춤(다음 휠에 이어감)   ms: 이 프레임까지 오는 시간(없으면 --s1step)
 *  프레임은 경유지일 뿐 — 위치(프레임 단위) 하나를 rAF 로 굴리고, 정지점 사이 구간마다 이징을 한 번만 건 뒤
 *  프레임 사이를 선형 보간해서 매 프레임 인라인 스타일로 찍는다. 휠 올리면 같은 위치가 거꾸로 줄어 정방향의 거울로 되감김. */
const FRAMES = [
  { name: 0,   year: 0,   laptop: 314,   swap: 0 },                      // 1 기본 — KIM 크게
  { name: 0,   year: 0,   laptop: 453.6, swap: 1, stop: true, ms: 700 }, // 1' 스왑 — YUJIN 크게 (여기서 멈춤)
  { name: 0,   year: 0,   laptop: 314,   swap: 0, stop: true, ms: 700 }, // 1'' 다시 KIM 크게 (여기서 멈춤)
  { name: 78,  year: 35,  laptop: 226,   swap: 0 },   // 2
  { name: 165, year: 100, laptop: 156,   swap: 0 },   // 3
  { name: 420, year: 100, laptop: 60,    swap: 0 },   // 4
  { name: 420, year: 100, laptop: 60,    swap: 0 },   // 5
  { name: 420, year: 100, laptop: 60,    swap: 0 },   // 6
  { name: 420, year: 100, laptop: 60,    swap: 0 },   // 7
  { name: 420, year: 100, laptop: 60,    swap: 0 },   // 8
];
// 글자 8개(k i m y u j i2 n)의 두 배치 — #s1name 창 기준 [left, bottom, width, height]. swap 0 = KIM 크게(Figma #1), 1 = YUJIN 크게(#2)
const NAME_A = [[0, 0.14, 249.138, 370.86], [301.024, 0.18, 56.441, 370.817], [408.425, 0, 482.636, 378], [908, 0, 195, 234], [1152, 0, 187, 234], [1387.601, 0, 84.118, 233.997], [1521, 1, 34, 233], [1603.629, -0.4, 193.889, 234.404]];
const NAME_B = [[-1, 0, 156, 232], [187, 0, 35, 232], [254, 0, 301, 236], [524, -0.4, 312, 374], [876.482, -0.4, 300, 374], [1215.482, -0.4, 136, 374], [1390.482, 0.6, 55, 373], [1486.482, -0.4, 312, 374]];

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
const BODY_FROM = 2, BODY_TO = 9;   // FRAMES 의 이 구간(두 번째 정지점 → 끝) 동안 BODY 26프레임이 흐른다
const H_SEQ = 479;                  // 시퀀스 중 글상자 높이 (Figma). 이 높이를 채우는 만큼만 글을 보여준다

// CSS cubic-bezier(x1,y1,x2,y2) 를 t→진행도 함수로 (--s1stepEase 를 그대로 쓰기 위해)
function bezier(x1, y1, x2, y2) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const X = (t) => ((ax * t + bx) * t + cx) * t, Y = (t) => ((ay * t + by) * t + cy) * t;
  return (x) => { let t = x; for (let i = 0; i < 8; i++) { const e = X(t) - x; if (Math.abs(e) < 1e-5) break; t -= e / ((3 * ax * t + 2 * bx) * t + cx || 1e-6); } return Y(Math.min(1, Math.max(0, t))); };
}
function easeFn(name) {
  const m = /cubic-bezier\(([^)]+)\)/.exec(getComputedStyle(stage).getPropertyValue(name));
  return m ? bezier(...m[1].split(",").map(Number)) : bezier(0.5, 0, 0.5, 1);
}
const lerp = (a, b, t) => a + (b - a) * t;

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
    el.className = 'layer';
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
      const s = ln.text.trim();
      const n = mode === 'word' ? (s ? s.split(' ').filter(Boolean).length : 0) : [...s].length;
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
    for (; li < S.length && S[li].i0 + S[li].n < nVis; li++) {          // 중간 줄 — 남는 폭을 단위 사이에 흘림
      const { i0, n } = S[li];
      let sum = 0; for (let k = 0; k < n; k++) sum += uw[i0 + k];
      const extra = n > 1 ? Math.max(0, boxW - sum - gap * (n - 1)) / (n - 1) : 0;
      let x = 0; const y = li * LH;
      for (let k = 0; k < n; k++, i++) { P.els[i].style.transform = 'translate(' + x.toFixed(1) + 'px,' + y + 'px)'; x += uw[i] + gap + extra; }
    }
    if (li < S.length && i < nVis) {                                    // 마지막 줄 — 늘리지 않고 통째로 좌/우
      const { i0 } = S[li], n = Math.min(nVis, i0 + S[li].n) - i0;
      let sum = gap * Math.max(0, n - 1); for (let k = 0; k < n; k++) sum += uw[i0 + k];
      let x = Math.max(0, boxW - sum) * lastAlign; const y = li * LH;
      for (let k = 0; k < n; k++, i++) { P.els[i].style.transform = 'translate(' + x.toFixed(1) + 'px,' + y + 'px)'; x += uw[i] + gap; }
    }
    for (let k = P.shown; k < nVis; k++) P.els[k].style.display = '';    // 보이는 개수가 바뀐 만큼만 토글
    for (let k = nVis; k < P.shown; k++) P.els[k].style.display = 'none';
    P.shown = nVis;
  }
  // structA → structB 로 ft(0~1) 만큼 갈아끼운 모습을, 전체 alpha 로. 구조가 같으면 겹치지 않는다
  function show(boxW, lastAlign, nVis, structA, structB, ft, alpha) {
    if (alpha <= 0) { pair[0].el.style.display = pair[1].el.style.display = 'none'; return; }
    if (Math.round(structA) === Math.round(structB)) ft = 0;
    place(pair[0], structA, boxW, lastAlign, nVis);
    pair[0].el.style.display = '';
    // 0.5/0.5 로 겹치면 한가운데서 글자 밀도가 꺼지므로 밝기 합이 일정하도록 √ 로 겹친다
    pair[0].el.style.opacity = alpha * (ft > 0 ? Math.sqrt(1 - ft) : 1);
    if (ft > 0) {
      place(pair[1], structB, boxW, lastAlign, nVis);
      pair[1].el.style.display = '';
      pair[1].el.style.opacity = alpha * Math.sqrt(ft);
    } else pair[1].el.style.display = 'none';
  }
  return { els: [pair[0].el, pair[1].el], count: units.length, fitCount, show };
}

let tsA = null, tsB = null, nAll = 0, nSeq = 0;
function buildBody() {                                        // 문단 → 단위 span 두 벌 (처음 한 번)
  if (tsA) return;
  tsA = typeset(DUMMY.repeat(6), 'word');                     // 여백 본문 — 띄어쓰기 단위
  tsB = typeset(DUMMY2, 'char');                              // 바뀐 글 — 띄어쓰기가 없어 글자 단위
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
  nSeq = tsA.fitCount(BODY[0][1], H_SEQ);                        // 시퀀스: 479px(18줄), Figma 그대로
}

let pos = 0, dir = 0, raf = 0, lastT = 0, fullH = 0, ease = null, bodyEase = null, lockUntil = 0, wrapFade = 0.35;   // pos: 프레임 단위 위치 0 ~ n
const N = FRAMES.length - 1;
const STOPS = [0, ...FRAMES.map((f, i) => (f.stop ? i : -1)).filter((i) => i > 0), N];   // 정지점들 (양 끝 포함)

// 본문만 — FRAMES 의 BODY_FROM~BODY_TO 구간에 BODY 26프레임을 편다.
// p 는 이징 **전** 위치다: 본문은 --s1bodyEase 로 따로 이징한다(양끝 더 느리게, 가운데 더 빠르게).
// KIM YUJIN·2026 PORTFOLIO·노트북은 --s1stepEase 를 그대로 쓰므로 서로 영향이 없다.
function renderBody(p) {
  if (!tsA) return;
  const u01 = Math.min(1, Math.max(0, (p - BODY_FROM) / (BODY_TO - BODY_FROM)));
  const u = (bodyEase ? bodyEase(u01) : u01) * (BODY.length - 1);
  const i = Math.min(BODY.length - 2, Math.floor(u)), t = u - i;
  const A = BODY[i], B = BODY[i + 1];
  const x = lerp(A[0], B[0], t), w = lerp(A[1], B[1], t);
  const lastAlign = lerp(A[3], B[3], t), mix = lerp(A[4], B[4], t), nVis = lerp(nAll, nSeq, lerp(A[5], B[5], t));
  bodyClip.style.left = x + 'px'; bodyClip.style.width = w + 'px';
  // 높이를 아직 못 쟀는데 격자 전체 높이(null)가 섞인 구간이면 인라인을 비워 CSS(calc)에 맡긴다 — 0px 을 써넣어 본문이 통째로 사라지는 걸 막는다
  bodyClip.style.height = fullH > 0 || (A[2] != null && B[2] != null)
    ? lerp(A[2] ?? fullH, B[2] ?? fullH, t) + 'px' : '';
  body.style.width = w + 'px';
  // 구간의 앞부분은 줄 구조를 그대로 둔 채 폭만 벌어지고(단어가 줄을 안 건넘), 끝 wrapFade 만큼에서 다음 구조로 갈아낀다
  const ft = t <= 1 - wrapFade ? 0 : (t - (1 - wrapFade)) / wrapFade;
  tsA.show(w, lastAlign, nVis,      A[1], B[1], ft, mix >= 1 ? 0 : mix > 0 ? Math.sqrt(1 - mix) : 1);
  tsB.show(w, lastAlign, tsB.count, A[1], B[1], ft, mix <= 0 ? 0 : mix < 1 ? Math.sqrt(mix) : 1);
}
function render(q) {                                        // q: --s1stepEase 가 적용된 위치(프레임 단위) → 프레임 사이 보간. 본문은 renderBody 가 따로 그린다
  q = Math.min(N, Math.max(0, q));
  const i = Math.min(N - 1, Math.floor(q)), t = q - i;
  const A = FRAMES[i], B = FRAMES[i + 1];
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
  body.style.width = ""; year.style.transform = ""; laptop.style.bottom = "";
  for (const e of letters) e.style.left = e.style.bottom = e.style.width = e.style.height = e.style.transform = "";
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
  pos += dir * dt / ms;
  // 정지점: 진행 방향으로 처음 만나는 정지점을 넘으면 거기서 멈춤
  const stop = dir > 0 ? STOPS.find((st) => st > before && st <= pos) : [...STOPS].reverse().find((st) => st < before && st >= pos);
  if (stop !== undefined) { pos = stop; dir = 0; lockUntil = now + 400; }   // 같은 휠 동작이 정지점을 뚫지 않게 잠깐 잠금
  render(eased(pos));                                                 // 글자·라벨·노트북 (--s1stepEase)
  renderBody(pos);                                                    // 본문 (이징 전 위치 — 안에서 --s1bodyEase 를 건다)
  if (dir === 0 && pos === 0) clear();
  raf = dir ? requestAnimationFrame(tick) : 0;
}
const atStart = () => pos === 0 && dir === 0;
function play(d) {
  if ((d > 0 && pos >= N) || (d < 0 && pos <= 0)) return;
  if (dir === 0 && performance.now() < lockUntil) return;
  buildBody();
  if (atStart()) {                                          // 출발할 때 한 번 잼
    measureFill();
    ease = easeFn('--s1stepEase');                          // 글자·라벨·노트북
    bodyEase = easeFn('--s1bodyEase');                      // 초록 본문 — 양끝 더 느리게, 가운데 더 빠르게
    const f = parseFloat(getComputedStyle(stage).getPropertyValue('--s1wrap'));   // 구간 중 줄 구조를 갈아끼우는 비율
    wrapFade = Math.min(0.9, Math.max(0.05, isNaN(f) ? 0.35 : f));
  }
  dir = d;
  if (!raf) { lastT = performance.now(); raf = requestAnimationFrame(tick); }
}
const LINE = 26, LINE_MS = 38;   // 본문 행간(px) · 한 줄 드러나는 간격(ms)
export function initStage1() {
  body.textContent = DUMMY.repeat(6);                         // 폰트 오기 전엔 문단 그대로
  sizing();
  const ready = document.fonts ? document.fonts.load(FONT).then(() => document.fonts.ready) : Promise.resolve();
  ready.then(buildBody);
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
