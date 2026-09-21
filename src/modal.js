/* ═══════════ 프로젝트 모달 (임시 — 실제로는 상세 페이지 라우팅으로 교체) ═══════════ */
import { SHAPES } from './data.js';
import { $ } from './utils.js';

const modal = $('#modal');

export function isModalOpen() { return modal.classList.contains('on'); }

export function openProject(p) {
  $('#mt').textContent = p.t; $('#mm').textContent = p.m;
  const svg = '<svg viewBox="0 0 68 68" width="52" height="52">' + SHAPES[p.o] + '</svg>';
  $('#sl1').innerHTML = svg; $('#sl2').innerHTML = svg;
  modal.classList.add('on'); $('#close').focus();
}

function shut() { modal.classList.remove('on'); }

export function initModal() {
  $('#close').addEventListener('click', shut);
  modal.addEventListener('click', (e) => { if (e.target === modal) shut(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') shut(); });
}
