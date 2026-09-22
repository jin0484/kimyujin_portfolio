/*
 *  main.js — 초기화 + 스크롤 오케스트레이션.
 *  화면별 동작은 stages/stage1~3.js, 편집할 값은 data.js.
 */
import './styles/index.css';

import { SCROLL_HEIGHT, T } from './data.js';
import { $, cl } from './utils.js';
import { state } from './state.js';
import { initStage1, refresh as refreshStage1, updateStage1 } from './stages/stage1.js';
import { initStage2, buildHoles, layoutText, revealCols } from './stages/stage2.js';
import { initStage3, sizeCanvas, resetParts, updateStage3 } from './stages/stage3.js';
import { initModal } from './modal.js';
import { setNudge, updateChrome } from './chrome.js';

const s1 = $('#s1'), s2 = $('#s2'), s3 = $('#s3');

/* ═══════════ 스크롤 오케스트레이션 ═══════════ */
function frame() {
  const max = document.body.scrollHeight - window.innerHeight;
  const p = max > 0 ? cl(window.scrollY / max, 0, 1) : 0;

  // 각 화면의 불투명도 (구간 경계는 data.js 의 T)
  const o1 = 1 - cl((p - T.s1End) / (T.s2In - T.s1End), 0, 1);
  const o2 = cl((p - T.s1End - 0.02) / (T.s2In - T.s1End), 0, 1) * (1 - cl((p - T.s2End) / (T.dissolve - T.s2End + 0.03), 0, 1));
  const o3 = cl((p - T.s2End - 0.01) / 0.05, 0, 1);

  s1.style.opacity = o1; s1.style.pointerEvents = o1 > 0.5 ? 'auto' : 'none';
  s2.style.opacity = o2; s2.style.pointerEvents = o2 > 0.5 ? 'auto' : 'none';
  s3.style.opacity = o3;
  s1.style.filter = o1 < 1 ? 'blur(' + ((1 - o1) * 4).toFixed(1) + 'px)' : 'none';

  updateStage1(p);
  const ns = p < T.s1End + 0.04 ? 1 : (p < T.s2End + 0.02 ? 2 : 3);
  if (ns !== state.stage) { state.stage = ns; setNudge(); }
  if (state.stage >= 2) revealCols();

  updateStage3(p, o3);
  updateChrome(p);
}

let tick = false;
function onScroll() {
  if (!tick) { tick = true; requestAnimationFrame(() => { frame(); tick = false; }); }
}
window.addEventListener('scroll', onScroll, { passive: true });

let rz;
function onResize() {
  clearTimeout(rz);
  rz = setTimeout(() => {
    refreshStage1(); buildHoles();
    sizeCanvas(); resetParts(); frame();
  }, 180);
}
window.addEventListener('resize', onResize);

/* ═══════════ init ═══════════ */
$('#scroller').style.height = SCROLL_HEIGHT;
initStage1(); initStage2(); initStage3(); initModal();
setNudge(); updateChrome(0);

function boot() {
  refreshStage1(); layoutText(); setNudge(); frame();   // 폰트 로드 후 다시 계측·조판
}
if (document.fonts && document.fonts.ready) document.fonts.ready.then(boot); else setTimeout(boot, 400);
