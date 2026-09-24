/* ═══════════ 유리 구슬 — 화면 2(WORK), 네모박스가 나오기 전 빈 공간에 떠다니는 큰 구슬 (2026-09-24 피드백) ═══════════
 *
 * KIM YUJIN 퇴장이 끝나갈 때(진행도 GROW 구간) 커지며 나타나, 가운데·왼쪽 빈 공간을 천천히 떠다니다 벽에 튕긴다.
 *   — 떠다니는 범위는 왼쪽 위 WORK 줄(첫 가로선 위) · 오른쪽 SPOILER 단(1273 부터) · 노트북을 피한 네모
 * 건들면 스친 방향으로 튕겨 나갔다가 천천히 원래 빠르기로 돌아온다(U 링 · J 큐브와 같은 "건들면 튕김").
 * 네모박스가 나오면(두 번째 휠) 박스가 나오는 만큼 SPOILER 맨 아랫줄 **첫 단어 바로 왼쪽**으로 날아가며 점만큼 작아진다
 *   (마지막 줄은 오른끝 맞춤이라 왼쪽이 비어 있다 — 2026-09-24 사용자가 짚어 준 자리. 처음엔 줄 끝 마침표였는데 격자선에 붙어 밖으로 나갔다).
 *   박스를 끌어 글이 다시 짜이면 그 끝을 따라가고, 세 번째 휠에 글이 사라질 때 같이 작아져 사라진다. 휠을 올리면 전부 거꾸로.
 *
 * 재질·방식은 glassBits.js 와 같다(구슬 둘레 네모 캔버스 + 그 자리 배경을 한 벌 더 그려 굴절). 배경은 바탕·격자 선만 —
 * 떠다니는 범위에 다른 게 없고, 글 앞에 붙을 땐 점 크기라 굴절이 거의 안 보여서.
 * 진행 상태(퇴장 · 박스 · ABOUT ME)는 stage1.js 가 setOrb 로 알려준다 — 여기서 stage1 을 부르면 서로 물고 물려서.
 *
 * 만질 값(#s1 의 CSS 변수, stage1.css): --orbSize: 지름 = 격자 높이 × 이만큼 · --orbDrift: 떠다니는 빠르기(px/s, 1920 기준)
 * --orbDot: 마지막 줄 앞에 붙었을 때 지름 = 글자 줄 높이 × 이만큼. 재질은 링과 같은 --glassBend · --glassRainbow · --glassTint
 */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { $ } from './utils.js';

const DW = 1920, FOV = 20, BACK = 600, MARGIN = 1.4;
const GROW = [0.85, 1];                     // 퇴장 진행도 중 이 구간에서 0 → 제 크기로 커짐
const FREE_R = 1250;                        // 떠다니는 범위 오른끝(무대 x) — SPOILER 단(1273)과 겹선 앞
const stage = $('#s1stage'), grid = $('#s1grid'), bodyClip = $('#s1bodyclip');

let st = { exit: 0, box: 0, gone: false };  // stage1.js 가 매번 알려줌: 퇴장 진행도(0~1) · 박스 진행도(등장 0~1 + 사라짐 0~1) · ABOUT ME 중인지
export function setOrb(exit, box, gone) { st.exit = exit; st.box = box; st.gone = gone; }

let K = {}, still = false, side = 0;
let renderer, scene, camera, cvs, bg, bgx, tex, back, mesh, tint;
const O = { x: 0, y: 0, vx: 0, vy: 0, placed: false, t: 0, spin: 0 };   // 떠다니는 자리·속도(무대 좌표, px/s)
const ptr = { x: -1, y: -1, dx: 0, dy: 0, moved: false };
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, k) => a + (b - a) * k;
const seg = (p, [a, b]) => clamp((p - a) / (b - a), 0, 1);
const smooth = (x) => x * x * (3 - 2 * x);

function knobs() {
  const cs = getComputedStyle($('#s1')), n = (k, d) => { const v = parseFloat(cs.getPropertyValue(k)); return isNaN(v) ? d : v; };
  K = { bend: n('--glassBend', 1), rainbow: n('--glassRainbow', 2), tint: n('--glassTint', 0.3),
        size: n('--orbSize', 0.3), drift: n('--orbDrift', 45), dot: n('--orbDot', 0.3) };
  K.paper = cs.backgroundColor;
  K.main = getComputedStyle(document.documentElement).getPropertyValue('--main').trim() || '#C3DCA8';
}

const stageH = () => parseFloat(stage.style.height) || 1080;
const bigD = () => K.size * (stageH() - 120);             // 떠다닐 때 지름(무대 px)

function resize() {
  knobs();
  const s = innerWidth / DW, dpr = Math.min(devicePixelRatio || 1, 2);
  camera.aspect = innerWidth / innerHeight;
  camera.position.z = (innerHeight / 2) / Math.tan(FOV * Math.PI / 360);   // z=0 평면에서 1 = CSS 1px
  camera.updateProjectionMatrix();
  side = Math.ceil(bigD() * s * MARGIN / 32) * 32;          // 가장 클 때(떠다닐 때) 크기로 한 번만 — 도중에 캔버스를 새로 잡으면 멈칫
  renderer.setPixelRatio(dpr);
  renderer.setSize(side, side, false);
  cvs.style.width = cvs.style.height = side + 'px';
  bg.width = bg.height = Math.round(side * dpr);
  tex.dispose();
  mesh.material.thickness = 0.6 * K.bend;
  mesh.material.dispersion = K.rainbow;
  tint.uTint.value.set(0xffffff).lerp(new THREE.Color(K.main), K.tint);
}

/* 떠다니는 범위(무대 좌표, 구슬 가운데가 움직일 수 있는 네모) */
function freeBox(D) {
  const H = stageH(), sy = (H - 120) / 960;
  return { x0: 60 + D / 2, x1: FREE_R - D / 2, y0: 60 + 237 * sy + D / 2, y1: H - 60 - D / 2 };
}

/* SPOILER 글의 진짜 마지막 줄 첫 단어(화면 좌표 사각형). 글이 통째로 숨었으면(박스를 끝까지 키워 글상자 폭 0) null */
function lastLineHead() {
  const g = [...document.querySelectorAll('#s1body .ts.hv')].find((e) => e.style.display !== 'none');
  if (!g) return null;
  let head = null;
  for (let i = g.children.length - 1; i >= 0; i--) {         // 뒤에서부터 — 윗변이 같은 동안은 같은 줄
    const w = g.children[i];
    if (w.style.display === 'none') continue;
    const r = w.getBoundingClientRect();
    if (!r.width) continue;
    if (head && Math.abs(r.top - head.top) > 1) break;
    head = r;
  }
  return head;
}
let held = null;                                            // 마지막으로 붙어 있던 자리(무대 좌표) — 글이 통째로 숨으면 그 자리에서 사라짐

function paintBack(x0, y0) {                                // 바탕 · 격자 선 (네모와 겹치는 것만)
  const dpr = bg.width / side;
  const hit = (r) => r.right >= x0 && r.left <= x0 + side && r.bottom >= y0 && r.top <= y0 + side;
  bgx.setTransform(1, 0, 0, 1, 0, 0);
  bgx.fillStyle = K.paper; bgx.fillRect(0, 0, bg.width, bg.height);
  bgx.setTransform(dpr, 0, 0, dpr, -x0 * dpr, -y0 * dpr);
  bgx.fillStyle = getComputedStyle(grid).fill;
  for (const el of grid.querySelectorAll('rect:not(.bd)')) {
    const r = el.getBoundingClientRect();
    if (r.width && r.height && hit(r)) bgx.fillRect(r.left, r.top, r.width, r.height);
  }
  tex.needsUpdate = true;
}

let lastSig = '';
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, Math.max(0, (now - (O.t || now)) / 1000)); O.t = now;
  const grow = smooth(seg(st.exit, GROW));
  const a = smooth(clamp(st.box, 0, 1)), c = smooth(clamp(st.box - 1, 0, 1));   // 글 끝으로 가는 정도 · 글과 같이 사라지는 정도
  if (!grow || st.gone || c >= 1) {                         // 안 보일 때 — 다음에 나오면 가운데서 다시
    if (cvs.style.visibility !== 'hidden') cvs.style.visibility = 'hidden';
    if (!grow) O.placed = false;
    setOver(false);
    return;
  }
  const s = innerWidth / DW, sr = stage.getBoundingClientRect();
  const D = bigD(), B = freeBox(D);
  if (!O.placed) {                                          // 처음 나올 때 — 빈 공간 가운데, 아무 방향으로 천천히
    O.x = (B.x0 + B.x1) / 2; O.y = (B.y0 + B.y1) / 2;
    const ang = Math.random() * Math.PI * 2;
    O.vx = Math.cos(ang) * K.drift; O.vy = Math.sin(ang) * K.drift; O.placed = true;
  }
  if (a < 1 && !still) {                                    // 떠다니기 — 빠르면 천천히 원래 빠르기로, 벽에 닿으면 튕김
    const sp = Math.hypot(O.vx, O.vy);
    if (sp > K.drift) { const k = Math.max(K.drift / sp, Math.exp(-dt * 1.1)); O.vx *= k; O.vy *= k; }
    O.x += O.vx * dt; O.y += O.vy * dt;
    if (O.x < B.x0) { O.x = B.x0; O.vx = Math.abs(O.vx); } else if (O.x > B.x1) { O.x = B.x1; O.vx = -Math.abs(O.vx); }
    if (O.y < B.y0) { O.y = B.y0; O.vy = Math.abs(O.vy); } else if (O.y > B.y1) { O.y = B.y1; O.vy = -Math.abs(O.vy); }
    O.spin += dt * (0.25 + Math.hypot(O.vx, O.vy) / D * 0.8); // 굴러가는 만큼 돎
  }
  let cx = O.x, cy = O.y, d = D * grow;                    // 무대 좌표
  if (a > 0) {                                              // 네모박스가 나오는 만큼 마지막 줄 앞으로 — 점 크기로
    const w = lastLineHead();
    if (w) {                                                // 박스를 끌면 글과 같이 밀려감 — 마지막 줄 첫 단어를 매 프레임 따라감
      const lh = w.height / s;
      held = { x: (w.left - sr.left) / s - lh * (0.25 + K.dot / 2), y: (w.top + w.height * 0.5 - sr.top) / s, d: lh * K.dot };   // 첫 단어 바로 왼쪽, 줄 가운데
    } else if (held) held.d = 0;                            // 글이 다 밀려나 숨었으면 그 자리에서 없어짐 (가운데로 돌아가지 않음)
    if (held) { cx = lerp(O.x, held.x, a); cy = lerp(O.y, held.y, a); d = lerp(d, held.d, a); }
    d *= 1 - c;                                             // 세 번째 휠 — 글과 같이 작아져 사라짐
  } else held = null;
  // 화면 좌표로
  const px = sr.left + cx * s, py = sr.top + cy * s, pd = d * s;
  if (pd < 0.5) { cvs.style.visibility = 'hidden'; setOver(false); return; }
  cvs.style.visibility = '';
  const dpr = renderer.getPixelRatio();
  const x0 = Math.round((px - side / 2) * dpr) / dpr, y0 = Math.round((py - side / 2) * dpr) / dpr;
  cvs.style.transform = 'translate(' + x0 + 'px,' + y0 + 'px)';
  // 다 붙은 뒤엔 글자처럼 글상자(#s1bodyclip) 아랫변에서 잘린다 — 박스에 밀려 마지막 줄이 글상자 밖으로 나가면 점도 같이 잘려 사라짐
  const cb = a >= 0.99 ? bodyClip.getBoundingClientRect().bottom : Infinity;
  cvs.style.clipPath = cb < y0 + side ? 'inset(0 0 ' + Math.max(0, y0 + side - cb) + 'px 0)' : '';
  const sig = x0 + ',' + y0 + ',' + side + [...grid.querySelectorAll('rect:not(.bd)')].map((e) => e.getAttribute('x') + e.getAttribute('y') + e.getAttribute('width') + (e.parentNode.getAttribute('transform') || '')).join();
  if (sig !== lastSig) { lastSig = sig; paintBack(x0, y0); }

  // 건들면 튕김 — 포인터가 구슬 위를 스치면 스친 방향으로 (떠다닐 때만)
  const on = ptr.x >= 0 && Math.hypot(ptr.x - px, ptr.y - py) < pd / 2;
  if (on && ptr.moved && a < 0.5 && !still) {
    O.vx += ptr.dx / s * 7; O.vy += ptr.dy / s * 7;
    const sp = Math.hypot(O.vx, O.vy), mx = 1400;
    if (sp > mx) { O.vx *= mx / sp; O.vy *= mx / sp; }
  }
  ptr.dx = ptr.dy = 0; ptr.moved = false;
  setOver(on && a < 0.5);

  camera.setViewOffset(innerWidth, innerHeight, x0, y0, side, side);   // 전체 화면 중 이 네모만 → 3D 좌표 = 화면 좌표
  const mx = x0 + side / 2 - innerWidth / 2, my = innerHeight / 2 - y0 - side / 2;
  const k = (camera.position.z + BACK) / camera.position.z;
  back.scale.set(side * k, side * k, 1);
  back.position.set(mx * k, my * k, -BACK);
  mesh.position.set(px - innerWidth / 2, innerHeight / 2 - py, 0);
  mesh.scale.setScalar(pd);
  mesh.rotation.set(0.3 + O.spin * 0.6, O.spin, 0);
  tint.uCx.value = mesh.position.x; tint.uD.value = pd;
  renderer.render(scene, camera);
}
let over = false;
function setOver(on) {
  if (on === over) return;
  over = on;
  document.documentElement.classList.toggle('glassorb', on);   // cursor.js 가 보고 원을 키움
}

export function initOrb() {
  cvs = document.createElement('canvas');
  cvs.className = 's1orb'; cvs.setAttribute('aria-hidden', 'true'); cvs.style.visibility = 'hidden';
  $('#s1stage').after(cvs);
  try { renderer = new THREE.WebGLRenderer({ canvas: cvs, alpha: true, antialias: true, premultipliedAlpha: true }); }
  catch { cvs.remove(); return; }                            // WebGL 안 되면 구슬 없이
  renderer.setClearColor(0x000000, 0);
  scene = new THREE.Scene();
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
  camera = new THREE.PerspectiveCamera(FOV, 1, 10, 20000);
  bg = document.createElement('canvas'); bgx = bg.getContext('2d');
  tex = new THREE.CanvasTexture(bg); tex.colorSpace = THREE.SRGBColorSpace;
  back = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: tex, depthWrite: false, toneMapped: false }));
  back.renderOrder = -1;
  back.onBeforeRender = (r) => { back.material.colorWrite = r.getRenderTarget() !== null; };   // 굴절용으로만 — 화면엔 안 찍음
  scene.add(back);
  tint = { uTint: { value: new THREE.Color() }, uCx: { value: 0 }, uD: { value: 1 } };
  mesh = new THREE.Mesh(new THREE.SphereGeometry(0.5, 96, 64), new THREE.MeshPhysicalMaterial({
    color: 0xffffff, metalness: 0, roughness: 0.03, transmission: 1, ior: 1.5, specularIntensity: 1, clearcoat: 1, clearcoatRoughness: 0.04,
  }));
  mesh.material.onBeforeCompile = (sh) => {                  // 링과 같은 초록 물들이기 — 왼쪽 끝 --glassTint 만큼, 오른쪽 끝 무색
    Object.assign(sh.uniforms, tint);
    sh.fragmentShader = 'uniform vec3 uTint; uniform float uCx, uD;\n' + sh.fragmentShader.replace('#include <color_fragment>',
      '#include <color_fragment>\n  diffuseColor.rgb *= mix( vec3( 1.0 ), uTint, clamp( 0.5 - ( vWorldPosition.x - uCx ) / uD, 0.0, 1.0 ) );');
  };
  scene.add(mesh);
  still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  addEventListener('pointermove', (e) => {
    if (ptr.x >= 0) { ptr.dx += e.clientX - ptr.x; ptr.dy += e.clientY - ptr.y; }
    ptr.x = e.clientX; ptr.y = e.clientY; ptr.moved = true;
  }, { passive: true });
  resize();
  let rz; addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { resize(); lastSig = ''; }, 120); });
  requestAnimationFrame(frame);
}
