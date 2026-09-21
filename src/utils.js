export const $ = (s) => document.querySelector(s);
export const cl = (v, a, b) => (v < a ? a : v > b ? b : v);
export const smooth = (t) => t * t * (3 - 2 * t);
export const lerp = (a, b, t) => a + (b - a) * t;

// 환경 감지
export const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches; // 감지만 하고 아직 분기 없음 (SPEC 5-4)
export const fine   = window.matchMedia('(pointer: fine)').matches;
