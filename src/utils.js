export const $ = (s) => document.querySelector(s);

/* 공용 빠르기 — 평소 1. 스크롤 막대 섹션 이름을 눌러 이동하는 동안만 올라간다(stage1.js jump).
 * box.js · about.js 는 매 프레임 흐른 시간(dt)에 이걸 곱해서, 이동 중엔 네모박스·격자선·ABOUT ME 연출이 같이 빨라진다 */
export const tempo = { k: 1 };

// CSS cubic-bezier(x1,y1,x2,y2) 를 t→진행도 함수로 (--s1stepEase 를 그대로 쓰기 위해)
export function bezier(x1, y1, x2, y2) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const X = (t) => ((ax * t + bx) * t + cx) * t, Y = (t) => ((ay * t + by) * t + cy) * t;
  return (x) => { let t = x; for (let i = 0; i < 8; i++) { const e = X(t) - x; if (Math.abs(e) < 1e-5) break; t -= e / ((3 * ax * t + 2 * bx) * t + cx || 1e-6); } return Y(Math.min(1, Math.max(0, t))); };
}
