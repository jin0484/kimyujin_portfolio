/* ═══════════ 유리 링 — 화면 1, U 오른쪽 기둥에 걸린 링 (시안) ═══════════
 *
 * 3D(<canvas>)는 뒤에 있는 HTML 글자를 못 본다. 그래서 링 둘레만큼의 배경(바탕·격자·KIM YUJIN·초록 글)을
 * 2D 캔버스에 **똑같은 자리로 한 벌 더 그려서** 3D 장면 안에 판으로 깔고, 유리는 그 판을 굴절시킨다.
 * 판은 굴절용으로만 쓰고 화면엔 안 찍는다(onBeforeRender 에서 colorWrite 를 끔) → 링 밖은 투명, 진짜 DOM 이 그대로 보임.
 * 캔버스는 링 둘레 네모만큼만 (camera.setViewOffset 으로 전체 화면 중 그 칸만 그림) — 화면 전체를 그리면 무겁다.
 *
 * 걸려 있기: U 기둥이 링 구멍을 지나간다. 링 뒤쪽 반(z < 0)은 U 뒤로 숨어야 해서, U 모양 그대로 z = 0 에
 * **깊이만 쓰는 판(가림판)** 을 세운다 — 그 뒤로 간 링은 안 그려지고(투명) 그 자리엔 진짜 U 가 보인다.
 * 링은 U 상자에 붙어 다닌다 — 호버로 YUJIN 이 커지면 같이 커지고, 휠 퇴장 때 같이 내려간다.
 *
 * 만질 값(#s1 의 CSS 변수, stage1.css):
 *   --glassX · --glassY : 링 중심 — U 상자 안 비율(0 = 왼쪽/위, 1 = 오른쪽/아래). 오른쪽 기둥 가운데 = .9075
 *   --glassSize         : 링 바깥 지름 = U 폭 × 이만큼   --glassTube: 링 굵기(지름 대비)
 *   --glassTilt         : 눕힌 각도(deg, 클수록 납작)   --glassSpin: 한 번 흔들리는 주기(s)
 *   --glassBend         : 굴절 세기(유리 두께)  --glassRainbow: 테두리 무지개(분산)
 *   --glassTint         : 유리 왼쪽 끝에 메인 초록이 물드는 정도(0 = 무색, 1 = 메인 색 그대로) — 오른쪽 끝으로 갈수록 투명
 */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { $ } from './utils.js';

const DW = 1920, FOV = 20, BACK = 600;   // 배경 판은 링보다 이만큼 뒤 (링이 흔들리며 앞뒤로 튀어나와도 판을 안 뚫게)
const MARGIN = 1.5;                        // 캔버스 네모 = 링 지름 × 이만큼 (기울어 흔들릴 때·굴절로 옆을 끌어올 때 여유)

let renderer, scene, camera, ring, back, hold, bg, bgx, tex, mk, mkx, mtex, cvs;
const tintU = { uTint: { value: new THREE.Color() }, uCx: { value: 0 }, uD: { value: 1 } };
let K = {}, lastSig = '', lastPaint = 0, t0 = 0, still = false, side = 0;
const grid = $('#s1grid'), nameBox = $('#s1name'), body = $('#s1body'), bodyClip = $('#s1bodyclip');
const U = $('#s1name .s1-u');
const letters = [...document.querySelectorAll('#s1name img')];

function knobs() {
  const cs = getComputedStyle($('#s1')), n = (k, d) => { const v = parseFloat(cs.getPropertyValue(k)); return isNaN(v) ? d : v; };
  K = { x: n('--glassX', 0.9075), y: n('--glassY', 0.3), size: n('--glassSize', 0.9), tube: n('--glassTube', 0.26),
        tilt: n('--glassTilt', 62) * Math.PI / 180, spin: n('--glassSpin', 14), bend: n('--glassBend', 1), rainbow: n('--glassRainbow', 2), tint: n('--glassTint', 0.3) };
  K.paper = cs.backgroundColor;
  K.main = getComputedStyle(document.documentElement).getPropertyValue('--main').trim() || '#C3DCA8';
}

function build() {                                             // 바깥 지름 1 짜리 링 — 실제 크기는 매 프레임 scale 로
  const r = K.tube / 2, R = 0.5 - r;
  if (ring) ring.geometry.dispose();
  const geo = new THREE.TorusGeometry(R, r, 96, 256);
  if (!ring) {
    ring = new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({
      color: 0xffffff, metalness: 0, roughness: 0.03,
      transmission: 1, ior: 1.5, specularIntensity: 1,
      clearcoat: 1, clearcoatRoughness: 0.04,
    }));
    // 초록 물들이기 — 화면 왼쪽 끝은 --glassTint 만큼, 오른쪽 끝은 무색으로 그라데이션 (링이 흔들려도 화면 기준 좌우).
    // 유리 몸통 색(diffuseColor)은 비쳐 보이는 빛에만 곱해지므로 반사광은 그대로 흰색
    ring.material.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, tintU);
      sh.fragmentShader = 'uniform vec3 uTint; uniform float uCx, uD;\n' + sh.fragmentShader.replace('#include <color_fragment>',
        '#include <color_fragment>\n  diffuseColor.rgb *= mix( vec3( 1.0 ), uTint, clamp( 0.5 - ( vWorldPosition.x - uCx ) / uD, 0.0, 1.0 ) );');
    };
    scene.add(ring);
  } else ring.geometry = geo;
  ring.material.thickness = r * 2 * K.bend;
  ring.material.dispersion = K.rainbow;
  tintU.uTint.value.set(0xffffff).lerp(new THREE.Color(K.main), K.tint);   // 왼쪽 끝 색 = 흰색과 메인 초록을 --glassTint 만큼 섞은 것
}

function resize() {
  knobs(); build();
  camera.aspect = innerWidth / innerHeight;
  camera.position.z = (innerHeight / 2) / Math.tan(FOV * Math.PI / 360);   // z=0 평면에서 1 = CSS 1px
  camera.updateProjectionMatrix();
  side = 0; lastSig = '';
}

function setSide(px) {                                         // 캔버스 크기 — 호버로 U 가 커지는 동안 계속 바뀌지 않게 32px 단위로
  const n = Math.ceil(px / 32) * 32;
  if (n === side) return;
  side = n;
  const dpr = Math.min(devicePixelRatio || 1, 2);
  renderer.setPixelRatio(dpr);
  renderer.setSize(side, side, false);
  cvs.style.width = cvs.style.height = side + 'px';
  bg.width = bg.height = mk.width = mk.height = Math.round(side * dpr);
  // GPU 쪽 텍스처는 처음 크기로 한 번 잡히면 그대로라, 캔버스가 커진 뒤엔 올리기가 실패해 배경 사본·가림판이 멈춰 있었다
  // (호버로 커질 때 굴절된 U 기둥이 덜컹거린 원인) → 크기가 바뀌면 버리고 새 크기로 다시 잡게
  tex.dispose(); mtex.dispose();
  lastSig = '';
}

/* 링 둘레 네모에 화면 그대로 다시 그리기 — 바탕 · 격자 선 · KIM YUJIN · 초록 글. 가림판(mk)엔 U 만 */
function paintBack(x0, y0) {
  const dpr = bg.width / side, s = innerWidth / DW;
  bgx.setTransform(1, 0, 0, 1, 0, 0);
  bgx.fillStyle = K.paper; bgx.fillRect(0, 0, bg.width, bg.height);
  bgx.setTransform(dpr, 0, 0, dpr, -x0 * dpr, -y0 * dpr);
  bgx.fillStyle = getComputedStyle(grid).fill;
  for (const el of grid.querySelectorAll('rect:not(.bd)')) {
    const b = el.getBoundingClientRect();
    if (b.width && b.height) bgx.fillRect(b.left, b.top, b.width, b.height);
  }
  // 초록 본문 — 단어 span 마다 같은 자리에 글자로. 창(#s1bodyclip) 밖은 자름
  const c = bodyClip.getBoundingClientRect();
  if (c.width && c.height) {
    const cs = getComputedStyle(body);
    bgx.save();
    bgx.beginPath(); bgx.rect(c.left, c.top, c.width, c.height); bgx.clip();
    bgx.font = cs.fontWeight + ' ' + parseFloat(cs.fontSize) * s + 'px ' + cs.fontFamily;
    bgx.fillStyle = cs.color;
    const asc = bgx.measureText('가').fontBoundingBoxAscent;   // span 상자 윗변 = 글꼴 ascent 위 → 기준선
    for (const g of body.children) {
      const a = parseFloat(g.style.opacity || getComputedStyle(g).opacity);
      if (!(a > 0)) continue;
      bgx.globalAlpha = a;
      for (const w of g.children) {
        const b = w.getBoundingClientRect();
        if (b.right < x0 || b.left > x0 + side || b.bottom < y0 || b.top > y0 + side || !b.width) continue;
        if (w.style.visibility === 'hidden') continue;
        bgx.fillText(w.textContent, b.left, b.top + asc);
      }
    }
    bgx.restore();
  }
  const n = nameBox.getBoundingClientRect();
  const win = (x) => { x.save(); x.beginPath(); x.rect(n.left, n.top - 240 * s, n.width, n.height + 240 * s); x.clip(); };   // stage1.css #s1name clip-path 와 같게
  win(bgx);
  for (const im of letters) {
    if (!im.complete) continue;
    const b = im.getBoundingClientRect();
    bgx.drawImage(im, b.left, b.top, b.width, b.height);
  }
  bgx.restore();
  tex.needsUpdate = true;

  mkx.setTransform(1, 0, 0, 1, 0, 0);
  mkx.clearRect(0, 0, mk.width, mk.height);
  mkx.setTransform(dpr, 0, 0, dpr, -x0 * dpr, -y0 * dpr);
  win(mkx);
  if (U.complete) { const b = U.getBoundingClientRect(); mkx.drawImage(U, b.left, b.top, b.width, b.height); }
  mkx.restore();
  mtex.needsUpdate = true;
}

/* 매 프레임 — 링 흔들림. 그런데 rAF 순서상 이게 호버 스프링(stage1 swapTick)보다 **먼저** 돌아서 한 프레임 전 U 를 보고 그린다.
 * U 가 빨리 커졌다 작아지는 동안 그만큼 가림판이 어긋나 링이 엉뚱한 자리에서 잘려 보였다 → U 를 움직인 쪽이 움직인 직후 syncGlass() 로 다시 그림 */
function frame(now) {
  requestAnimationFrame(frame);
  draw(now);
}
export function syncGlass() { if (renderer && cvs.isConnected) draw(performance.now()); }   // stage1.js render · clear 끝에서 (KIM YUJIN 을 옮긴 직후)

function draw(now) {
  const s = innerWidth / DW, u = U.getBoundingClientRect();
  const D = u.width * K.size;                                  // 링 바깥 지름(px)
  const cx = u.left + u.width * K.x, cy = u.top + u.height * K.y;
  const floor = innerHeight - 60 * s;                          // 격자 아랫선
  if (cy - D / 2 > floor || !D) { cvs.style.visibility = 'hidden'; return; }   // 퇴장으로 다 내려갔으면 쉼
  cvs.style.visibility = '';
  setSide(D * MARGIN);

  const dpr = bg.width / side;
  const x0 = Math.round((cx - side / 2) * dpr) / dpr, y0 = Math.round((cy - side / 2) * dpr) / dpr;
  cvs.style.transform = 'translate(' + x0 + 'px,' + y0 + 'px)';
  // 격자 밖은 안 보인다 (전역 규칙) — 캔버스 기준으로 격자 아랫선 아래를 자름
  cvs.style.clipPath = 'inset(0 0 ' + Math.max(0, y0 + side - floor) + 'px 0)';

  const sig = x0 + ',' + y0 + ',' + side + letters.map((im) => { const b = im.getBoundingClientRect(); return im.complete + b.left + ',' + b.top + ',' + b.width + ',' + b.height; }).join('|')
            + [...grid.querySelectorAll('rect:not(.bd)')].map((e) => e.getAttribute('y') + e.getAttribute('width')).join()
            + bodyClip.style.cssText + body.style.cssText + body.childElementCount + (body.firstChild && body.firstChild.style ? body.firstChild.style.opacity : '')
            + (document.fonts ? document.fonts.status : '');
  if (sig !== lastSig || now - lastPaint > 500) { lastSig = sig; lastPaint = now; paintBack(x0, y0); }   // 못 잡은 변화가 있어도 0.5초마다 한 번은 다시

  // 카메라: 전체 화면 중 이 네모만 그림 → 3D 좌표가 화면 좌표와 딱 맞음
  camera.setViewOffset(innerWidth, innerHeight, x0, y0, side, side);
  const mx = x0 + side / 2 - innerWidth / 2, my = innerHeight / 2 - y0 - side / 2;
  const k = (camera.position.z + BACK) / camera.position.z;
  back.scale.set(side * k, side * k, 1);
  back.position.set(mx * k, my * k, -BACK);
  hold.scale.set(side, side, 1);                               // 가림판은 z = 0 이라 배율 1
  hold.position.set(mx, my, 0);

  // 위쪽 반이 뒤로(U 뒤에 숨음), 아래쪽 반이 앞으로(U 위를 지나감). 기운 채로 좌우·앞뒤로 천천히 흔들림
  const a = still ? 0 : ((now - t0) / 1000 / K.spin) * Math.PI * 2;
  ring.position.set(cx - innerWidth / 2, innerHeight / 2 - cy, 0);
  ring.scale.setScalar(D);
  tintU.uCx.value = ring.position.x; tintU.uD.value = D;       // 초록 그라데이션: 링 왼쪽 끝 → 오른쪽 끝
  ring.rotation.set(-K.tilt + Math.sin(a * 0.7 + 1) * 0.08, Math.sin(a) * 0.22, -0.1 + Math.sin(a * 0.5) * 0.05);
  renderer.render(scene, camera);
}

export function initGlass() {
  cvs = document.createElement('canvas');
  cvs.id = 's1glass'; cvs.setAttribute('aria-hidden', 'true');
  $('#s1stage').after(cvs);
  try { renderer = new THREE.WebGLRenderer({ canvas: cvs, alpha: true, antialias: true, premultipliedAlpha: true }); }
  catch { cvs.remove(); return; }                              // WebGL 안 되면 링 없이
  renderer.setClearColor(0x000000, 0);
  scene = new THREE.Scene();
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;   // 반사 — 흰 스튜디오 방
  camera = new THREE.PerspectiveCamera(FOV, 1, 10, 20000);

  bg = document.createElement('canvas'); bgx = bg.getContext('2d');
  tex = new THREE.CanvasTexture(bg); tex.colorSpace = THREE.SRGBColorSpace;
  back = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: tex, depthWrite: false, toneMapped: false }));
  back.renderOrder = -1;
  // 배경 판은 유리가 굴절시킬 때(투과 패스 = 렌더 타깃이 있을 때)만 그리고, 화면에는 안 찍는다
  back.onBeforeRender = (r) => { back.material.colorWrite = r.getRenderTarget() !== null; };
  scene.add(back);

  // 가림판 — U 모양대로 깊이만 씀(색은 안 찍음). 이 뒤로 간 링은 가려져서 진짜 U 가 보인다
  mk = document.createElement('canvas'); mkx = mk.getContext('2d');
  mtex = new THREE.CanvasTexture(mk);
  hold = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: mtex, alphaTest: 0.5, colorWrite: false }));
  scene.add(hold);

  still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  resize();
  let rz; addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(resize, 120); });
  t0 = performance.now();
  requestAnimationFrame(frame);
}
