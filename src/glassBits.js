/* ═══════════ 유리 조각 — 화면 1, M 을 뺀 나머지 글자에 얹은 3D 유리 (2026-09-24 피드백 "M 건들지 말고 나머지에 3D") ═══════════
 *
 * U 의 유리 링(glass.js)과 같은 재질·같은 방식으로 하나 더:
 *   J  — 기둥 위에 떠서 천천히 도는 모서리 둥근 유리 큐브 — j 의 점처럼. 건들면 스친 방향으로 휙 돌다 느려짐
 *        (처음엔 YUJIN 의 I 위였는데, 바로 위에 노트북이 있어 모서리가 겹쳤다 — J 기둥은 노트북 왼끝에서 20px 떨어져 있다)
 * Y 의 V 홈에 얹은 유리 구슬도 있었는데 2026-09-24 사용자 요청으로 뺐다.
 * KIM 쪽(K·I)은 뒤에 본문이 흘러서, 유리가 그걸 굴절하려면 매 프레임 단어 1,600개를 다시 그려야 한다 — 호버가 다시 끊겨서 뺐다.
 *
 * 방식은 glass.js 와 같다: 조각 둘레 네모만큼만 캔버스를 두고, 그 자리의 배경(바탕·격자 선·KIM YUJIN)을 2D 캔버스에 똑같이
 * 한 벌 더 그려 3D 장면 안에 판으로 깔면 유리가 그 판을 굴절시킨다. 판은 화면엔 안 찍는다.
 * 조각마다 캔버스·렌더러가 따로다. 캔버스 크기는 글자가 가장 커질 때(YUJIN 크게 + 튕김) 크기로 한 번만 잡는다 —
 * 호버 도중에 캔버스를 새로 잡으면 멈칫한다(glass.js reserveGlass 와 같은 이유).
 * 호버·퇴장으로 글자가 움직이면 stage1.js 가 움직인 직후 syncBits() 로 같이 그린다(한 프레임 늦지 않게).
 *
 * 만질 값(#s1 의 CSS 변수, stage1.css): --bitCube: 큐브 한 변 = J 기둥 굵기 × 이만큼 · --bitCubeGap: J 위로 뜬 거리(기둥 굵기 대비)
 * 재질은 링과 같은 --glassBend · --glassRainbow · --glassTint 를 쓴다
 */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { $ } from './utils.js';

const DW = 1920, FOV = 20, BACK = 600, OVER = 1.1;   // OVER: 호버 스프링이 넘칠 때 여유
const grid = $('#s1grid'), nameBox = $('#s1name');
const letters = [...document.querySelectorAll('#s1name img')];
/* J 기둥 — j.svg(84×234)에서 잰 값. 오른쪽 50~84 가 기둥(굵기 = 폭의 0.405, 가운데 = 폭의 0.798) */
const J_X = 0.798, J_W = 0.405;

let K = {}, still = false, lastSync = -1e9;
const bits = [];
const ptr = { x: -1, y: -1, dx: 0, dy: 0, moved: false };

function knobs() {
  const cs = getComputedStyle($('#s1')), n = (k, d) => { const v = parseFloat(cs.getPropertyValue(k)); return isNaN(v) ? d : v; };
  K = { bend: n('--glassBend', 1), rainbow: n('--glassRainbow', 2), tint: n('--glassTint', 0.3),
        cube: n('--bitCube', 1.15), gap: n('--bitCubeGap', 0.4) };
  K.paper = cs.backgroundColor;
  K.main = getComputedStyle(document.documentElement).getPropertyValue('--main').trim() || '#C3DCA8';
}

/* ── 조각 정의 — 어느 글자에, 무슨 모양으로, 어디에, 어떻게 움직이나 ──
 *  size(w): 글자 폭 w 일 때 조각 크기(px) · box(size): 캔버스에 담아야 할 크기(px, 돌거나 흔들려도 안 잘리게)
 *  maxW: 그 글자가 가장 커질 때 폭(디자인 px, stage1.js NAME_A/NAME_B 의 큰 쪽) */
const DEFS = [
  { // J — 기둥 위에 뜬 큐브 (j 의 점)
    sel: '.s1-j', maxW: 136,
    geo: () => new RoundedBoxGeometry(1, 1, 1, 6, 0.14),
    thick: 0.7,
    size: (w) => K.cube * J_W * w,
    box: (C) => C * Math.sqrt(3) * 1.45 + C * 0.3,             // 돌면 대각선만큼 + 둥실 뜨는 폭
    place(u, C, b) {
      const a = still ? 0 : (performance.now() - b.t0) / 1000;
      const bob = Math.sin(a * 1.6) * 0.1 * C;                 // 둥실
      return { cx: u.left + u.width * J_X, cy: u.top - K.gap * J_W * u.width - C * 0.75 + bob };
    },
    move(b, now, dt) {
      const a = still ? 0 : (now - b.t0) / 1000;
      b.sx += b.vx * dt; b.sy += b.vy * dt;
      const f = Math.exp(-dt * 1.4); b.vx *= f; b.vy *= f;     // 휙 돌다 느려짐
      b.mesh.rotation.set(0.5 + a * 0.23 + b.sx, 0.6 + a * 0.37 + b.sy, 0.2);
    },
    poke(b, dx, dy) { b.vy += dx * 0.06; b.vx += dy * 0.06; },
    hitR: (C) => C * 0.75,
  },
];

function makeBit(def) {
  const el = $('#s1name ' + def.sel);
  const cvs = document.createElement('canvas');
  cvs.className = 's1bit'; cvs.setAttribute('aria-hidden', 'true');
  $('#s1stage').after(cvs);
  const renderer = new THREE.WebGLRenderer({ canvas: cvs, alpha: true, antialias: true, premultipliedAlpha: true });
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
  const camera = new THREE.PerspectiveCamera(FOV, 1, 10, 20000);
  const bg = document.createElement('canvas'), bgx = bg.getContext('2d');
  const tex = new THREE.CanvasTexture(bg); tex.colorSpace = THREE.SRGBColorSpace;
  const back = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: tex, depthWrite: false, toneMapped: false }));
  back.renderOrder = -1;
  back.onBeforeRender = (r) => { back.material.colorWrite = r.getRenderTarget() !== null; };   // 굴절용으로만 — 화면엔 안 찍음
  scene.add(back);
  const tint = { uTint: { value: new THREE.Color() }, uCx: { value: 0 }, uD: { value: 1 } };
  const mesh = new THREE.Mesh(def.geo(), new THREE.MeshPhysicalMaterial({
    color: 0xffffff, metalness: 0, roughness: 0.03, transmission: 1, ior: 1.5, specularIntensity: 1, clearcoat: 1, clearcoatRoughness: 0.04,
  }));
  mesh.material.onBeforeCompile = (sh) => {                     // 링과 같은 초록 물들이기 — 왼쪽 끝 --glassTint 만큼, 오른쪽 끝 무색
    Object.assign(sh.uniforms, tint);
    sh.fragmentShader = 'uniform vec3 uTint; uniform float uCx, uD;\n' + sh.fragmentShader.replace('#include <color_fragment>',
      '#include <color_fragment>\n  diffuseColor.rgb *= mix( vec3( 1.0 ), uTint, clamp( 0.5 - ( vWorldPosition.x - uCx ) / uD, 0.0, 1.0 ) );');
  };
  scene.add(mesh);
  return { def, el, cvs, renderer, scene, camera, bg, bgx, tex, back, mesh, tint, side: 0, sig: '', painted: 0, over: false,
           sx: 0, sy: 0, vx: 0, vy: 0, t0: performance.now(), t: 0 };
}

function resize() {
  knobs();
  const s = innerWidth / DW, dpr = Math.min(devicePixelRatio || 1, 2);
  for (const b of bits) {
    b.camera.aspect = innerWidth / innerHeight;
    b.camera.position.z = (innerHeight / 2) / Math.tan(FOV * Math.PI / 360);   // z=0 평면에서 1 = CSS 1px
    b.camera.updateProjectionMatrix();
    b.side = Math.ceil(b.def.box(b.def.size(b.def.maxW * OVER) * s) / 32) * 32;   // 가장 커질 때 크기로 한 번만
    b.renderer.setPixelRatio(dpr);
    b.renderer.setSize(b.side, b.side, false);
    b.cvs.style.width = b.cvs.style.height = b.side + 'px';
    b.bg.width = b.bg.height = Math.round(b.side * dpr);
    b.tex.dispose();                                            // 크기가 바뀐 텍스처는 새로 잡게 (glass.js setSide 와 같은 이유)
    b.mesh.material.thickness = b.def.thick * K.bend;
    b.mesh.material.dispersion = K.rainbow;
    b.tint.uTint.value.set(0xffffff).lerp(new THREE.Color(K.main), K.tint);
    b.sig = '';
  }
}

/* 조각 둘레 네모에 화면 그대로 다시 그리기 — 바탕 · 격자 선 · KIM YUJIN. 네모와 안 겹치는 건 건너뜀 */
function paintBack(b, x0, y0) {
  const g = b.bgx, side = b.side, dpr = b.bg.width / side, s = innerWidth / DW;
  const hit = (r) => r.right >= x0 && r.left <= x0 + side && r.bottom >= y0 && r.top <= y0 + side;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.fillStyle = K.paper; g.fillRect(0, 0, b.bg.width, b.bg.height);
  g.setTransform(dpr, 0, 0, dpr, -x0 * dpr, -y0 * dpr);
  g.fillStyle = getComputedStyle(grid).fill;
  for (const el of grid.querySelectorAll('rect:not(.bd)')) {
    const r = el.getBoundingClientRect();
    if (r.width && r.height && hit(r)) g.fillRect(r.left, r.top, r.width, r.height);
  }
  const n = nameBox.getBoundingClientRect();
  g.save(); g.beginPath(); g.rect(n.left, n.top - 240 * s, n.width, n.height + 240 * s); g.clip();   // stage1.css #s1name clip-path 와 같게
  for (const im of letters) {
    if (!im.complete) continue;
    const r = im.getBoundingClientRect();
    if (hit(r)) g.drawImage(im, r.left, r.top, r.width, r.height);
  }
  g.restore();
  b.tex.needsUpdate = true;
}

function draw(b, now) {
  const dt = Math.min(0.05, Math.max(0, (now - (b.t || now)) / 1000)); b.t = now;
  const s = innerWidth / DW, u = b.el.getBoundingClientRect();
  const D = b.def.size(u.width);
  if (!still) b.def.move(b, now, dt, D);
  const { cx, cy } = b.def.place(u, D, b);
  const floor = innerHeight - 60 * s;                          // 격자 아랫선 — 퇴장으로 다 내려갔으면 쉼
  if (!D || cy - D > floor) { b.cvs.style.visibility = 'hidden'; b.over = false; return; }
  b.cvs.style.visibility = '';
  const side = b.side, dpr = b.renderer.getPixelRatio();       // 캔버스 자리는 화면 픽셀에 맞춤
  const x0 = Math.round((cx - side / 2) * dpr) / dpr, y0 = Math.round((cy - side / 2) * dpr) / dpr;
  b.cvs.style.transform = 'translate(' + x0 + 'px,' + y0 + 'px)';
  b.cvs.style.clipPath = 'inset(0 0 ' + Math.max(0, y0 + side - floor) + 'px 0)';   // 격자 밖은 안 보인다

  const sig = x0 + ',' + y0 + ',' + side + letters.map((im) => { const r = im.getBoundingClientRect(); return im.complete + r.left + ',' + r.top + ',' + r.width + ',' + r.height; }).join('|')
            + [...grid.querySelectorAll('rect:not(.bd)')].map((e) => e.getAttribute('y') + e.getAttribute('width')).join();
  if (sig !== b.sig || now - b.painted > 500) { b.sig = sig; b.painted = now; paintBack(b, x0, y0); }

  b.camera.setViewOffset(innerWidth, innerHeight, x0, y0, side, side);   // 전체 화면 중 이 네모만 → 3D 좌표 = 화면 좌표
  const mx = x0 + side / 2 - innerWidth / 2, my = innerHeight / 2 - y0 - side / 2;
  const k = (b.camera.position.z + BACK) / b.camera.position.z;
  b.back.scale.set(side * k, side * k, 1);
  b.back.position.set(mx * k, my * k, -BACK);
  b.mesh.position.set(cx - innerWidth / 2, innerHeight / 2 - cy, 0);
  b.mesh.scale.setScalar(D);
  b.tint.uCx.value = b.mesh.position.x; b.tint.uD.value = D;

  // 건들면 — 포인터가 조각 위를 스치면 그 방향으로 밀림 (프레임 사이 움직인 거리)
  const on = ptr.x >= 0 && Math.hypot(ptr.x - cx, ptr.y - cy) < b.def.hitR(D);
  if (on && ptr.moved && !still) b.def.poke(b, ptr.dx, ptr.dy);
  b.over = on;
  b.renderer.render(b.scene, b.camera);
}

function drawAll(now) {
  for (const b of bits) draw(b, now);
  ptr.dx = ptr.dy = 0; ptr.moved = false;
  document.documentElement.classList.toggle('glassbit', bits.some((b) => b.over));   // cursor.js 가 보고 원을 키움
}
function frame(now) {
  requestAnimationFrame(frame);
  if (now - lastSync < 40) return;                             // 스테이지가 이미 그렸으면(syncBits) 이번엔 쉼 — 한 프레임 두 번 렌더 안 하게
  drawAll(now);
}
export function syncBits() { if (bits.length) { lastSync = performance.now(); drawAll(lastSync); } }   // stage1.js render · clear 끝에서

export function initBits() {
  knobs();
  try { for (const def of DEFS) bits.push(makeBit(def)); }
  catch { for (const b of bits) b.cvs.remove(); bits.length = 0; return; }   // WebGL 안 되면 조각 없이
  still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  addEventListener('pointermove', (e) => {
    if (ptr.x >= 0) { ptr.dx += e.clientX - ptr.x; ptr.dy += e.clientY - ptr.y; }
    ptr.x = e.clientX; ptr.y = e.clientY; ptr.moved = true;
  }, { passive: true });
  resize();
  let rz; addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(resize, 120); });
  requestAnimationFrame(frame);
}
