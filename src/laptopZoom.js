/* ══════════ 노트북 클릭 → 노트북 정면으로 다가가 화면 가득, 그대로 WORK 로 (2026-09-24 피드백 · 2026-09-25 측면 → 정면) ══════════
 *
 * 노트북 사진은 오른쪽 앞에서 비스듬히 본 각도라, 그냥 확대만 하면 비뚤어진 화면이 비뚤어진 채 커져서 부자연스러웠다.
 * 그래서 사진 속 검은 화면의 네 모서리(SCREEN)가 커지는 동안 **정면에서 본 직사각형(16:10)으로 조금씩 옮겨 가게** 하고,
 * 매 프레임 그 네 점에 맞는 원근 변환(호모그래피 → matrix3d)을 노트북 전체에 건다 — 카메라가 노트북 정면으로 돌아 들어가며 다가가는 것처럼.
 *   · 크기는 배율(로그)로 키운다 — 직선으로 키우면 처음엔 굼뜨고 끝에 확 커진다
 *   · 화면 가운데는 그 배율만큼 목표로 다가간다 — 한 점을 향해 줌인하는 느낌
 *   · 모양(기울기·원근)은 같은 이징으로 정면 직사각형이 된다
 * 끝나면 검은 화면이 격자 안쪽을 다 덮고 work.html 로 넘어간다 — 그쪽도 같은 검정이라 이음매가 없다.
 * 순서: 누름 → CLICK 이 꺼짐(깜빡임처럼 페이드 없이 한 번에) → CLICK_GAP 뒤 커지기 시작 (2026-09-25 사용자 요청 — 커지는 동안 글자가 없게).
 * (예전엔 CLICK 을 같이 키워 페이지 전환으로 work.html 까지 들고 갔는데, 브라우저가 원래 크기로 찍은 사진을 늘려 보여 계단처럼 깨졌다)
 * will-change: transform 은 걸지 않는다 — 걸면 처음 크기로 한 번 구운 그림을 늘려 보여서 커질수록 깨진다.
 * 그동안 격자 바깥 여백은 노트북 화면이 넘어가는 자리만 검게 칠해지고(--lapQuad — 화면이 먼저 닿는 오른쪽·아래부터), 유리 링·SCROLL DOWN 은 비켜준다(stage1.css html.lapzoom).
 * 노트북은 box.js 가 줄여 놨을 수도 있어서(오른쪽 아래 기준 scale) 거기서 출발한다. 뒤로 가기로 돌아오면(bfcache) 원래대로.
 * --lapZoom: 걸리는 시간 · --lapZoomEase: 이징 (stage1.css #s1)
 */
import { $, bezier } from './utils.js';

const PAD = 60, ASPECT = 1.6, COVER = 1.08;   // 격자 바깥 여백(무대 px) · 정면 화면 비율(16:10) · 격자를 덮고 남길 여유
const CLICK_GAP = 150;                        // CLICK 이 꺼지고 커지기 시작할 때까지(ms) — 순서가 읽히게
/* 사진 속 검은 화면의 네 모서리 — 노트북 상자(307×244) 기준, laptop.png 를 화면과 같게 자르고 뒤집어 어두운 픽셀로 잰 값
 *  [왼쪽 위, 오른쪽 위, 오른쪽 아래, 왼쪽 아래]. 오른쪽 변이 더 길고 아랫변이 더 기울어 있다(오른쪽 앞에서 본 각도) */
const SCREEN = [[114.25, 12], [300, 31.25], [279.25, 166], [93.25, 137]];   // 오른쪽 아래는 아랫변·오른변 직선을 이어 만나는 점(2026-09-26 다시 잼 — 전엔 키보드 그림자까지 잡혀 182 였다)

/* 네 점 src → dst 로 보내는 원근 변환 (x' = (a x + b y + c) / (g x + h y + 1), y' 도 같은 식) → CSS matrix3d */
function homography(src, dst) {
  const A = [], B = [];
  src.forEach(([x, y], i) => {
    const [u, v] = dst[i];
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]); B.push(u);
    A.push([0, 0, 0, x, y, 1, -v * x, -v * y]); B.push(v);
  });
  for (let c = 0; c < 8; c++) {                              // 가우스 소거 (부분 피벗)
    let p = c;
    for (let r = c + 1; r < 8; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    [A[c], A[p]] = [A[p], A[c]]; [B[c], B[p]] = [B[p], B[c]];
    for (let r = 0; r < 8; r++) {
      if (r === c) continue;
      const f = A[r][c] / A[c][c];
      for (let k = c; k < 8; k++) A[r][k] -= f * A[c][k];
      B[r] -= f * B[c];
    }
  }
  const [a, b, c, d, e, f, g, h] = B.map((v, i) => v / A[i][i]);
  return 'matrix3d(' + [a, d, 0, g, b, e, 0, h, 0, 0, 1, 0, c, f, 0, 1].join(',') + ')';
}
const centroid = (q) => [q.reduce((s, p) => s + p[0], 0) / 4, q.reduce((s, p) => s + p[1], 0) / 4];
const sizeOf = (q) => (Math.hypot(q[1][0] - q[0][0], q[1][1] - q[0][1]) + Math.hypot(q[2][0] - q[3][0], q[2][1] - q[3][1])) / 2;   // 윗변·아랫변 평균

export function initLaptopZoom() {
  const lap = $('#s1laptop'), stage = $('#s1stage'), s1 = $('#s1'), click = lap.querySelector('.click'), root = document.documentElement;
  let raf = 0, going = false, base = null;                    // base: 누르기 전 transform (box.js 가 줄여 놨을 수도) — 돌아오면 되돌림
  lap.addEventListener('click', (e) => {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;   // 새 탭으로 열기 등은 그대로
    e.preventDefault();
    if (going) return;
    going = true;
    const go = () => location.assign(lap.href);
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { go(); return; }

    // 무대 좌표 기준. 노트북 상자 안 좌표(SCREEN) → 무대 좌표 = 상자 자리 + (box.js 가 줄여 놨으면 오른쪽 아래 기준 scale)
    const ox = lap.offsetLeft, oy = lap.offsetTop, w = lap.offsetWidth, h = lap.offsetHeight;
    const m = /scale\(([-\d.]+)\)/.exec(lap.style.transform || ''), k0 = m ? parseFloat(m[1]) : 1;
    const from = SCREEN.map(([x, y]) => [ox + w + k0 * (x - w), oy + h + k0 * (y - h)]);
    // 도착: 격자 안쪽(1800 × 무대 높이 − 120)을 덮는 정면 16:10 직사각형, 격자 가운데
    const H0 = parseFloat(stage.style.height) || 1080, gw = 1920 - 2 * PAD, gh = H0 - 2 * PAD;
    const RW = Math.max(gw, gh * ASPECT) * COVER, RH = RW / ASPECT, cx = 960, cy = H0 / 2;
    const to = [[cx - RW / 2, cy - RH / 2], [cx + RW / 2, cy - RH / 2], [cx + RW / 2, cy + RH / 2], [cx - RW / 2, cy + RH / 2]];
    // 모양 · 크기 · 가운데로 나눠 보간
    const cA = centroid(from), cB = centroid(to), sA = sizeOf(from), sB = sizeOf(to);
    const nA = from.map(([x, y]) => [(x - cA[0]) / sA, (y - cA[1]) / sA]), nB = to.map(([x, y]) => [(x - cB[0]) / sB, (y - cB[1]) / sB]);
    const cs = getComputedStyle($('#s1'));
    const dur = (parseFloat(cs.getPropertyValue('--lapZoom')) || 0.9) * 1000;
    const em = /cubic-bezier\(([^)]+)\)/.exec(cs.getPropertyValue('--lapZoomEase'));
    const ease = em ? bezier(...em[1].split(',').map(Number)) : bezier(0.65, 0, 0.35, 1);
    const local = SCREEN.map(([x, y]) => [x, y]);              // 변환 기준 = 상자 왼쪽 위(transform-origin 0 0)
    const sr = stage.getBoundingClientRect(), pr = s1.getBoundingClientRect();
    const sc = sr.width / 1920, vx = sr.left - pr.left, vy = sr.top - pr.top;   // 무대 좌표 → #s1 안 화면 좌표 (무대는 scale 로 줄어 있음)

    const frame = (k) => {
      const t = ease(Math.min(1, Math.max(0, k)));
      const s = sA * Math.pow(sB / sA, t), g = (s - sA) / (sB - sA);   // 크기는 배율로, 가운데는 그 배율만큼
      const c = [cA[0] + (cB[0] - cA[0]) * g, cA[1] + (cB[1] - cA[1]) * g];
      const q = nA.map(([x, y], i) => [c[0] + s * (x + (nB[i][0] - x) * t) - ox, c[1] + s * (y + (nB[i][1] - y) * t) - oy]);
      lap.style.transform = homography(local, q);
      // 여백의 검은 테는 이 화면 모양(무대 → 화면 좌표)으로만 보이게 — 화면이 격자 밖으로 넘어가는 자리만 까매진다
      s1.style.setProperty('--lapQuad', 'polygon(' + q.map(([x, y]) => (vx + (x + ox) * sc).toFixed(1) + 'px ' + (vy + (y + oy) * sc).toFixed(1) + 'px').join(', ') + ')');
    };
    base = { transform: lap.style.transform, origin: lap.style.transformOrigin };
    lap.style.transformOrigin = '0 0';
    // will-change: transform 은 걸지 않는다 — 걸면 브라우저가 처음 크기(폭 307)로 한 번 구운 그림을 늘려 보여서, 10배 넘게 커지면 깨진다.
    // 안 걸면 커지는 동안 제 해상도로 다시 그린다(1초 남짓이라 부담 없음)
    click.style.animation = 'none'; click.style.visibility = 'hidden';   // 누르는 순간 글자부터 꺼짐
    root.classList.add('lapzoom');
    frame(0);
    const t0 = performance.now() + CLICK_GAP;                  // 글자가 꺼진 걸 보고 나서 커지기 시작
    const tick = (now) => {
      const k = Math.max(0, (now - t0) / dur);
      frame(k);
      if (k < 1) raf = requestAnimationFrame(tick);
      else { raf = 0; go(); }
    };
    raf = requestAnimationFrame(tick);
  });
  addEventListener('pageshow', (e) => {                        // 뒤로 가기로 돌아왔을 때 — 커진 채로 멈춰 있지 않게
    if (!e.persisted || !going) return;
    cancelAnimationFrame(raf); raf = 0; going = false;
    lap.style.transform = base ? base.transform : ''; lap.style.transformOrigin = base ? base.origin : '';
    click.style.animation = click.style.visibility = '';
    s1.style.removeProperty('--lapQuad');
    root.classList.remove('lapzoom');
  });
}
