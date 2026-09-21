// 화면 간 공유되는 상태. 프로토타입의 전역 stage / punched 에 해당.
export const state = {
  stage: 1,     // 현재 화면 1 | 2 | 3
  punched: 0,   // 화면 2에서 파낸 구멍 수
  holes: [],    // 파낸 구멍 { x%, y%, r% } — 클릭 순서대로 (화면 3 파티클이 이 자리를 비움)
};
