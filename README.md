# 포트폴리오 — 김유진

`prototype.html` 을 Vite + 바닐라 JS 프로젝트로 정리한 것. 동작은 프로토타입과 동일.
설계 의도와 알려진 한계는 [SPEC.md](SPEC.md) 참고.

## 실행

```bash
npm install
npm run dev
```

## 구조

```
index.html              마크업 골격 (텍스트는 data.js 에서 채움)
src/
  main.js               초기화 + 스크롤 오케스트레이션 (frame)
  data.js               ★ 고칠 값은 전부 여기: 텍스트 · 프로젝트 · 구멍 위치 · 스크롤 구간 · 튜닝 수치
  state.js              화면 간 공유 상태 (stage, punched)
  utils.js              $, cl, smooth, lerp, 환경 감지 (fine / reduce)
  chrome.js             진행 레일 · 화면 라벨 · 안내 문구
  modal.js              프로젝트 모달 (임시 — 상세 페이지 라우팅으로 교체 예정)
  stages/
    stage1.js           화면 1 — 캔버스. 글자 없이 단·행 격자만 그림
    stage2.js           화면 2 — 직접 조판(단·행·빈 구간) + 클릭한 곳에 원 파내기, 글자가 원을 감쌈
    stage3.js           화면 3 — 먼지 파티클 + 타이핑
  styles/
    index.css           스타일 진입점 (@import 순서)
    tokens.css          ★ CSS 변수 (색 · 폰트)
    base.css            리셋 · body · .layer
    stage1.css / stage2.css / stage3.css
    chrome.css / modal.css
prototype.html          원본 프로토타입 (참고용, 손대지 않음)
refs/                   레퍼런스 이미지
```

## 자주 고칠 것 → `src/data.js`

| 바꾸고 싶은 것 | 어디 |
|---|---|
| 더미 본문 | `DUMMY` |
| 프로젝트 6개 (이름 · 메타 · 도형) | `PROJ`, `SHAPES` |
| 구멍 크기 (위치는 클릭한 곳) | `HOLE_SIZES` 반지름% |
| 마지막 슬로건 | `SLOGAN` |
| 스크롤 구간 | `T`, `SCROLL_HEIGHT` |
| 격자 단 수/행 높이 · 격자 농도 · 파티클 수 · 타이핑 속도 등 | `TUNE` |
| 안내 문구 · 화면 라벨 | `LABELS` |
