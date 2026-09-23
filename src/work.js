/* work.js — 두 번째 페이지(work.html) 진입점.
 *  CLICK 은 화면 1 노트북 화면에서처럼 깜빡이다가(work.css wkblink), 화면을 한 번 누르면 꺼진 채로 안 돌아온다.
 *  깜빡임이 켜짐/꺼짐만 오가는 steps 애니메이션이라, 꺼지는 것도 페이드 없이 그 리듬 그대로 둔다. */
import './styles/index.css';
import './styles/work.css';

const work = document.querySelector('#work');
const off = () => work.classList.add('off');
work.addEventListener('click', off);
document.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); off(); } });
