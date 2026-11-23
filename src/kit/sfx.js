// 공통 키트 — 효과음. 음원 파일 없이 Web Audio로 합성한다.
// 브라우저는 사용자가 처음 누르기 전에는 소리를 막으므로, 첫 조작 때 AudioContext를 만든다.
export function initSfx(getSettings) {
  let ctx = null, master = null, noiseBuf = null;
  const boot = () => {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    ctx = new AC(); master = ctx.createGain(); master.connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  };
  addEventListener('pointerdown', boot, { passive: true }); addEventListener('keydown', boot);

  // 음 하나: 주파수 f→f2로 미끄러지며 dur초 동안 줄어든다
  const tone = (f, dur, { type = 'sine', f2 = f, vol = .25, at = 0 } = {}) => {
    const t = ctx.currentTime + at, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0008, t + dur);
    o.connect(g).connect(master); o.start(t); o.stop(t + dur + .02);
  };
  // 잡음: 필터 주파수 f→f2 (바람·불·먼지·비)
  const noise = (dur, { f = 1200, f2 = f, q = .7, vol = .3, at = 0, type = 'lowpass', attack = .005 } = {}) => {
    const t = ctx.currentTime + at, s = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuf; s.loop = true; fl.type = type; fl.Q.value = q;
    fl.frequency.setValueAtTime(f, t); fl.frequency.exponentialRampToValueAtTime(Math.max(30, f2), t + dur);
    g.gain.setValueAtTime(.0008, t); g.gain.exponentialRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(.0008, t + dur);
    s.connect(fl).connect(g).connect(master); s.start(t, Math.random()); s.stop(t + dur + .05);
  };

  const SOUNDS = {
    tap: () => tone(660, .06, { type: 'triangle', vol: .12 }),
    step: () => { tone(520, .09, { type: 'triangle', vol: .16 }); tone(780, .12, { type: 'triangle', vol: .12, at: .06 }); },
    knock: () => { noise(.07, { f: 900, q: 2, vol: .5, type: 'bandpass' }); tone(190, .12, { f2: 90, vol: .35 }); },          // 나무 맞춤 「딱」
    creak: () => tone(140, .35, { type: 'sawtooth', f2: 210, vol: .06 }),                                                    // 수레·얼레 삐걱
    launch: () => { noise(1.4, { f: 500, f2: 4500, vol: .5, attack: .04, type: 'bandpass', q: .5 }); tone(110, .5, { type: 'sawtooth', f2: 50, vol: .18 }); },
    whoosh: () => noise(.45, { f: 700, f2: 3200, vol: .14, attack: .05, type: 'bandpass', q: .8 }),
    thud: () => { tone(120, .3, { f2: 40, vol: .5 }); noise(.4, { f: 900, f2: 150, vol: .3 }); },
    boom: () => { tone(90, .7, { f2: 28, vol: .7 }); noise(.9, { f: 2400, f2: 120, vol: .5 }); },
    splash: () => noise(.3, { f: 2600, f2: 700, vol: .2, type: 'bandpass', q: 1.2 }),
    drip: () => tone(1400, .08, { f2: 600, vol: .14 }),
    rain: () => noise(1.6, { f: 5200, f2: 3800, vol: .1, attack: .3, type: 'highpass' }),
    ok: () => { tone(660, .12, { type: 'triangle', vol: .2 }); tone(990, .22, { type: 'triangle', vol: .2, at: .1 }); },
    no: () => tone(220, .28, { type: 'sawtooth', f2: 150, vol: .1 }),
    badge: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, .28, { type: 'triangle', vol: .18, at: i * .09 })),
  };
  return {
    play(name) {
      const s = getSettings(); if (!s.sound || !SOUNDS[name]) return;
      boot(); if (!ctx || ctx.state !== 'running') return;
      master.gain.value = s.volume; SOUNDS[name]();
    },
    names: Object.keys(SOUNDS),
  };
}
