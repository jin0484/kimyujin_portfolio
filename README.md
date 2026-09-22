# 김유진 — 포트폴리오

Vite + 바닐라 JS. `npm run dev` 로 실행.

```
index.html              화면 1 마크업 (Figma #1 프레임)
work.html               두 번째 페이지 — 노트북 클릭 시. Figma "Work #1": 지금은 격자만 (임시)
vite.config.js          페이지 두 개 빌드 설정
public/s1/              화면 1 에셋 — 격자·KIM YUJIN 글자·2026 PORTFOLIO (Figma 에서 받은 SVG)
src/
  main.js               초기화 · 리사이즈
  work.js               work.html 진입점
  data.js               ★ 손으로 고칠 값 — 본문(DUMMY)
  utils.js
  stages/stage1.js      화면 1 — 1920 기준 무대를 화면 폭에 맞춰 scale, 본문 한 줄씩 등장, KIM/YUJIN 호버 스왑
  styles/
    tokens.css          ★ CSS 변수 (색 · 폰트)
    base.css
    stage1.css          ★ 좌표·크기 (Figma 값 그대로), 호버 스왑 좌표·시간, CLICK 깜빡임
    work.css            work 페이지
```

| 바꾸고 싶은 것 | 어디 |
|---|---|
| 본문 글 | `data.js` `DUMMY` |
| 배경·메인 컬러 | `tokens.css` `--bg`, `--main` |
| 글자 위치·크기, 호버 이동 시간 | `stage1.css` |
| 격자·글자 모양 | Figma 에서 다시 내보내 `public/s1/` 교체 |

화면 2(신문 조판·파내기)·화면 3(먼지·타이핑)은 2026-09-22 제거 — 필요하면 커밋 `714a960` 참고.
