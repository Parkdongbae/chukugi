// 공통 키트 — 설정: 저장·불러오기, 설정 창, 문서에 반영
import { store, dialog } from './ui.js';

export const DEFAULTS = { text: 'm', theme: 'light', level: 'easy', quality: 'auto', labels: true, sound: true, volume: 0.6, motion: 'auto' };
const TEXT = { m: 100, l: 115, xl: 130 };

const ITEMS = [
  { key: 'text', name: '글자 크기', opts: [['m', '보통'], ['l', '크게'], ['xl', '아주 크게']] },
  { key: 'theme', name: '화면 색', hint: '고대비는 교실 TV나 밝은 곳에서 잘 보입니다.', opts: [['light', '밝게'], ['dark', '어둡게'], ['contrast', '고대비']] },
  { key: 'level', name: '설명 수준', hint: '「자세히」는 치수와 근거를 처음부터 펼쳐 보여 줍니다.', opts: [['easy', '쉬운 설명'], ['detail', '자세히']] },
  { key: 'quality', name: '그래픽 품질', hint: '화면이 끊기면 「낮음」으로 바꿔 보세요.', opts: [['auto', '자동'], ['low', '낮음'], ['mid', '보통'], ['high', '높음']] },
  { key: 'labels', name: '3D 이름표', opts: [[true, '켬'], [false, '끔']] },
  { key: 'sound', name: '소리', opts: [[true, '켬'], [false, '끔']], volume: true },
  { key: 'motion', name: '움직임 줄이기', hint: '카메라가 움직이는 장면을 짧게 줄입니다.', opts: [['auto', '기기 설정 따름'], ['reduced', '켬'], ['full', '끔']] },
];

export function initSettings(appId, { onChange = () => {}, onReset = () => {} } = {}) {
  const key = appId + '.settings.v1';
  const s = store.get(key, DEFAULTS);
  const mq = matchMedia('(prefers-reduced-motion: reduce)');
  const api = {
    get: k => s[k],
    all: () => ({ ...s }),
    reducedMotion: () => s.motion === 'reduced' || (s.motion === 'auto' && mq.matches),
    set(k, v) { s[k] = v; store.set(key, s); apply(); onChange(s, k); },
    open,
  };
  function apply() {
    const r = document.documentElement;
    r.dataset.theme = s.theme; r.dataset.level = s.level;
    r.dataset.motion = api.reducedMotion() ? 'reduced' : 'full';
    r.style.fontSize = TEXT[s.text] + '%';
    // 「자세히」면 더 알아보기를 모두 펼친다
    document.querySelectorAll('details.k-more[data-auto]').forEach(d => { d.open = s.level === 'detail'; });
  }
  let dlg;
  function open() {
    dlg = dialog('k-settings', '설정', '');
    draw(); dlg.open();
  }
  function draw() {
    dlg.body.innerHTML = ITEMS.map(it => `<div class="k-set"><b>${it.name}</b>${it.hint ? `<small>${it.hint}</small>` : ''}
      <div class="k-seg" role="group" aria-label="${it.name}">${it.opts.map(([v, n]) => `<button class="k-btn${s[it.key] === v ? ' on' : ''}" data-k="${it.key}" data-v="${v}" aria-pressed="${s[it.key] === v}">${n}</button>`).join('')}</div>
      ${it.volume ? `<div class="k-row" style="margin-top:.25rem"><label for="k-vol">소리 크기 <output>${Math.round(s.volume * 100)}%</output></label><input id="k-vol" type="range" min="0" max="100" step="5" value="${Math.round(s.volume * 100)}"></div>` : ''}</div>`).join('') +
      `<div class="k-set"><b>기록 지우기</b><small>내 기록(완료 표시, 배지, 점수)을 모두 지웁니다. 설정은 그대로 둡니다.</small><div class="k-btns" style="margin-top:.125rem"><button class="k-btn" data-reset>기록 지우기</button></div></div>`;
    dlg.body.onclick = e => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.k) { const raw = b.dataset.v, v = raw === 'true' ? true : raw === 'false' ? false : raw; api.set(b.dataset.k, v); draw(); }
      else if ('reset' in b.dataset) {
        if (b.dataset.sure) { onReset(); b.textContent = '지웠습니다'; b.disabled = true; }
        else { b.dataset.sure = 1; b.textContent = '정말 지울까요? 한 번 더 누르세요'; b.classList.add('no'); }
      }
    };
    dlg.body.querySelector('#k-vol').oninput = e => { api.set('volume', e.target.value / 100); e.target.previousElementSibling.querySelector('output').textContent = e.target.value + '%'; };
  }
  mq.addEventListener?.('change', () => { apply(); onChange(s, 'motion'); });
  apply();
  api.apply = apply;
  return api;
}
