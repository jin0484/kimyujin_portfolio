/* work.js — 두 번째 페이지(work.html) 진입점.
 *  가운데 CLICK 과 "누르면 꺼짐"은 2026-09-24 사용자 요청으로 뺐다.
 *  오른쪽 위 X(#workclose) · Esc — 첫 화면에서 노트북을 누르고 들어왔으면 뒤로 가기(원래 있던 화면·진행 그대로 돌아감),
 *  주소로 바로 들어왔으면 첫 화면을 새로 연다 */
import './styles/index.css';
import './styles/work.css';
import { initCursor } from './cursor.js';

initCursor();

const fromHome = (() => { try { return new URL(document.referrer).origin === location.origin && history.length > 1; } catch (e) { return false; } })();
const close = () => { if (fromHome) history.back(); else location.assign('/'); };
document.querySelector('#workclose').addEventListener('click', close);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
