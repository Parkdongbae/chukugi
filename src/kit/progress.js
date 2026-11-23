// 공통 키트 — 진행 기록과 배지 (기기에만 저장)
import { store, dialog, toast, stars } from './ui.js';

// menus: [{id, name}], badges: [{id, ico, name, how}], scores: [{id, name, max}] (별 개수로 보여 줄 기록)
export function initProgress(appId, { menus, badges = [], scores = [], sfx, onChange = () => {} }) {
  const key = appId + '.progress.v1';
  const blank = () => ({ done: {}, seen: {}, stars: {}, badges: {}, tries: {} });
  let p = { ...blank(), ...store.get(key, {}) };
  const save = () => { store.set(key, p); onChange(api); };
  const api = {
    isDone: id => !!p.done[id],
    done(id) { if (!p.done[id]) { p.done[id] = Date.now(); save(); } },
    // 묶음 안에서 본 항목을 표시하고, 지금까지 본 개수를 돌려준다
    see(group, item) { const g = (p.seen[group] ||= {}); if (!g[item]) { g[item] = 1; save(); } return Object.keys(g).length; },
    seen: (group, item) => !!p.seen[group]?.[item],
    star: id => p.stars[id] || 0,
    setStar(id, n) { if (n > (p.stars[id] || 0)) { p.stars[id] = n; save(); return true; } return false; },
    tries: id => p.tries[id] || 0,
    addTry(id) { p.tries[id] = (p.tries[id] || 0) + 1; save(); return p.tries[id]; },
    has: id => !!p.badges[id],
    award(id) {
      if (p.badges[id]) return false;
      const b = badges.find(x => x.id === id); if (!b) return false;
      p.badges[id] = Date.now(); save();
      toast(`${b.ico} 배지 획득: ${b.name}`, 3200); sfx?.play('badge');
      return true;
    },
    reset() { p = blank(); store.del(key); onChange(api); },
    open() {
      const got = badges.filter(b => p.badges[b.id]).length;
      dialog('k-progress', '내 기록', `
        <div class="k-set"><b>배운 곳</b><div class="k-tags">${menus.map(m => `<span class="k-tag" style="${p.done[m.id] ? 'border-color:var(--ok);font-weight:700' : 'opacity:.6'}">${p.done[m.id] ? '✓' : '○'} ${m.name}</span>`).join('')}</div></div>
        ${scores.length ? `<div class="k-set"><b>별</b>${scores.map(s => `<div style="display:flex;justify-content:space-between;gap:.5rem"><span>${s.name}</span>${stars(p.stars[s.id] || 0, s.max || 3)}</div>`).join('')}</div>` : ''}
        <div class="k-set"><b>배지 ${got} / ${badges.length}</b><div class="k-badges">${badges.map(b => `<div class="k-badge${p.badges[b.id] ? ' got' : ''}"><i aria-hidden="true">${b.ico}</i><b>${b.name}</b>${b.how}</div>`).join('')}</div>
        <small class="k-note">기록은 이 기기에만 저장됩니다. 설정에서 지울 수 있습니다.</small></div>`).open();
    },
  };
  return api;
}
