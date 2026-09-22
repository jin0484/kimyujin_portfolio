/* ═══════════ STAGE 1 — Figma "#1" 프레임 (1920 기준) ═══════════
 *
 * 격자(SVG) + 왼쪽 2단을 채운 본문(메인 컬러) + 하단 거대 KIM YUJIN(글자 하나하나 SVG).
 * 무대(#s1stage)는 폭 1920 고정, 화면 폭에 맞춰 scale. 높이는 뷰포트 높이 ÷ scale 로 잡아
 * 격자·본문은 위아래로 늘어나고 KIM YUJIN 은 바닥에 붙는다 (브라우저 탭·주소창 때문에 1080 이 안 돼도 가로가 꽉 참).
 * 좌표·크기는 Figma 값 그대로 (src/styles/stage1.css). 본문 글은 data.js 의 DUMMY.
 * 본문: 처음 들어올 때 위에서 아래로 한 줄씩 드러남 (clip-path 를 줄 수만큼의 steps 로 내림).
 * 호버: YUJIN 글자에 올리면 #2 프레임 배치(YUJIN 크게·KIM 작게)로, 작아진 KIM 에 올리면 #1 로 돌아옴 — 클래스 토글, 이동은 CSS transition.
 */
import { DUMMY } from '../data.js';
import { $ } from '../utils.js';

const stage = $('#s1stage'), body = $('#s1body');
const DW = 1920;

export function sizing() {
  const s = window.innerWidth / DW;
  stage.style.height = (window.innerHeight / s) + 'px';
  stage.style.transform = 'scale(' + s + ')';
}

export function refresh() { sizing(); }

const LINE = 26, LINE_MS = 38;   // 본문 행간(px) · 한 줄 드러나는 간격(ms)
export function initStage1() {
  body.textContent = DUMMY.repeat(6);
  sizing();
  setTimeout(() => {                                          // 본문 한 줄씩 드러내기
    const n = Math.max(1, Math.floor(body.clientHeight / LINE));
    body.style.transition = 'clip-path ' + (n * LINE_MS) + 'ms steps(' + n + ', end)';
    body.style.clipPath = 'inset(0 0 0 0)';
  }, 150);
  for (const e of stage.querySelectorAll('.s1-y, .s1-u, .s1-j, .s1-i2, .s1-n')) e.addEventListener('pointerenter', () => stage.classList.add('yujin'));
  for (const e of stage.querySelectorAll('.s1-k, .s1-i, .s1-m')) e.addEventListener('pointerenter', () => stage.classList.remove('yujin'));
}
