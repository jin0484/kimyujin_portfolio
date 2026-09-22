/*
 *  main.js — 초기화. 화면 동작은 stages/stage1.js, 편집할 값은 data.js.
 */
import './styles/index.css';

import { initStage1, refresh as refreshStage1 } from './stages/stage1.js';

let rz;
window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(refreshStage1, 120); });

initStage1();
if (document.fonts && document.fonts.ready) document.fonts.ready.then(refreshStage1);   // 폰트 로드 후 다시 계측
