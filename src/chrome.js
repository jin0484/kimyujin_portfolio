/* ═══════════ CHROME — 진행 레일 · 안내 문구 ═══════════ */
import { HOLE_SIZES, LABELS } from './data.js';
import { $ } from './utils.js';
import { state } from './state.js';

const railfill = $('#railfill'),
      nudge = $('#nudge'), nudgetxt = $('#nudgetxt');

export function setNudge() {
  if (state.stage === 1) {
    nudgetxt.textContent = LABELS.nudge.scroll;
    nudge.style.opacity = '1';
  } else if (state.stage === 2) {
    nudgetxt.innerHTML = state.punched >= HOLE_SIZES.length
      ? LABELS.nudge.done
      : LABELS.nudge.punch + ' &nbsp;<span class="cnt">' + state.punched + '/' + HOLE_SIZES.length + '</span>';
    nudge.style.opacity = '1';
  } else {
    nudge.style.opacity = '0';
  }
}

export function updateChrome(p) {
  railfill.style.height = (p * 100) + '%';
}
