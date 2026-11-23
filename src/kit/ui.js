// 공통 키트 — 작은 화면 도구: 저장소, 창, 알림, 도움말
export const $ = id => document.getElementById(id);
export const el = (tag, attrs = {}, html = '') => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) { if (k === 'class') e.className = v; else if (k.startsWith('on')) e[k] = v; else e.setAttribute(k, v); }
  if (html) e.innerHTML = html;
  return e;
};

// localStorage를 못 쓰는 환경(시크릿 모드, file:// 제한)에서는 메모리에만 둔다
const mem = {};
export const store = {
  get(key, fallback) { try { const v = localStorage.getItem(key); return v ? { ...fallback, ...JSON.parse(v) } : { ...fallback }; } catch { return { ...fallback, ...(mem[key] || {}) }; } },
  set(key, val) { mem[key] = val; try { localStorage.setItem(key, JSON.stringify(val)); } catch { /* 메모리만 */ } },
  del(key) { delete mem[key]; try { localStorage.removeItem(key); } catch { /* 무시 */ } },
};

// 창: <dialog> 하나를 만들어 돌려준다. body는 HTML 문자열 또는 노드
export function dialog(id, title, body) {
  let d = $(id);
  if (!d) {
    d = el('dialog', { id, class: 'k-dlg', 'aria-labelledby': id + '-t' },
      `<div class="k-dlg-in"><div class="k-dlg-head"><h2 id="${id}-t"></h2><button class="k-icon" data-close aria-label="닫기">✕</button></div><div class="k-dlg-body"></div></div>`);
    document.body.append(d);
    d.addEventListener('click', e => { if (e.target === d || e.target.closest('[data-close]')) d.close(); });
  }
  d.querySelector('h2').textContent = title;
  const b = d.querySelector('.k-dlg-body');
  if (typeof body === 'string') b.innerHTML = body; else if (body) b.replaceChildren(body);
  return { root: d, body: b, open() { if (!d.open) d.showModal(); }, close() { d.close(); } };
}

let toastBox;
export function toast(msg, ms = 2600) {
  if (!toastBox) { toastBox = el('div', { class: 'k-toasts', role: 'status', 'aria-live': 'polite' }); document.body.append(toastBox); }
  const t = el('div', { class: 'k-toast' }); t.textContent = msg; toastBox.append(t);
  setTimeout(() => t.remove(), ms);
}

// 도움말: slides = [{ico, title, text}]. 처음 방문 때 한 번 자동으로 연다
export function help(appId, slides) {
  const key = appId + '.help.v1';
  let i = 0;
  const dlg = dialog('k-help', '사용 방법', '');
  const draw = () => {
    const s = slides[i];
    dlg.body.innerHTML = `<div class="k-help-slide"><div class="ico" aria-hidden="true">${s.ico}</div><h3>${s.title}</h3><p>${s.text}</p></div>
      <div class="k-dots" aria-hidden="true">${slides.map((_, k) => `<button tabindex="-1" class="${k === i ? 'on' : k < i ? 'seen' : ''}"></button>`).join('')}</div>
      <div class="k-btns fill"><button class="k-btn" data-prev ${i ? '' : 'disabled'}>이전</button><button class="k-btn primary" data-next>${i === slides.length - 1 ? '시작하기' : '다음'}</button></div>`;
    dlg.body.querySelector('[data-prev]').onclick = () => { i--; draw(); };
    dlg.body.querySelector('[data-next]').onclick = () => { if (i === slides.length - 1) dlg.close(); else { i++; draw(); } };
  };
  dlg.root.addEventListener('close', () => store.set(key, { seen: true }));
  const open = () => { i = 0; draw(); dlg.open(); };
  if (!store.get(key, {}).seen) setTimeout(open, 400);
  return { open };
}

export const stars = (n, max = 3) => `<span class="k-stars" aria-label="별 ${n}개">${'★'.repeat(n)}<s>${'★'.repeat(max - n)}</s></span>`;
