// Tiny synthesizer for sound effects and a soft background tune.
// Nothing plays until the first tap (browsers require a user gesture).

let ctx = null;
let master = null;
let musicGain = null;
let sfxOn = true;
let musicOn = true;
let musicTimer = null;

export function initAudio() {
  if (!ctx) {
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain();
      master.gain.value = 0.9;
      master.connect(ctx.destination);
      musicGain = ctx.createGain();
      musicGain.gain.value = 0.05;
      musicGain.connect(master);
    } catch {
      ctx = null;
      return;
    }
  }
  if (ctx.state === 'suspended') ctx.resume();
  if (musicOn && !musicTimer) startMusic();
}

export function setSound(on) {
  sfxOn = on;
}

export function setMusic(on) {
  musicOn = on;
  if (!on && musicTimer) {
    clearInterval(musicTimer);
    musicTimer = null;
  }
  if (on && ctx && !musicTimer) startMusic();
}

function tone(freq, dur, { type = 'sine', vol = 0.12, at = 0, slide = 0, attack = 0.006, dest = null } = {}) {
  if (!ctx) return;
  const t0 = ctx.currentTime + at;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g);
  g.connect(dest || master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

const play = (fn) => () => {
  if (sfxOn && ctx) fn();
};

const NOTE = (n) => 440 * Math.pow(2, (n - 69) / 12);

export const sfx = {
  tap: play(() => tone(880, 0.05, { type: 'triangle', vol: 0.05 })),
  plant: play(() => {
    tone(220, 0.09, { type: 'triangle', vol: 0.12, slide: 120 });
    tone(520, 0.08, { type: 'sine', vol: 0.06, at: 0.05 });
  }),
  water: play(() => {
    for (let i = 0; i < 5; i++) tone(500 + Math.random() * 500, 0.07, { vol: 0.05, at: i * 0.045, slide: 400 });
  }),
  harvest: play(() => [72, 76, 79, 84].forEach((n, i) => tone(NOTE(n), 0.16, { type: 'triangle', vol: 0.09, at: i * 0.06 }))),
  coin: play(() => {
    tone(NOTE(83), 0.08, { type: 'square', vol: 0.04 });
    tone(NOTE(88), 0.22, { type: 'square', vol: 0.04, at: 0.07 });
  }),
  mutate: play(() => [84, 88, 91, 96, 100].forEach((n, i) => tone(NOTE(n), 0.25, { vol: 0.07, at: i * 0.07 }))),
  ripe: play(() => tone(NOTE(91), 0.18, { vol: 0.05 })),
  levelUp: play(() => [67, 72, 76, 79, 84, 79, 84].forEach((n, i) => tone(NOTE(n), 0.22, { type: 'triangle', vol: 0.1, at: i * 0.1 }))),
  chest: play(() => {
    tone(180, 0.25, { type: 'sawtooth', vol: 0.04, slide: 600 });
    [79, 83, 86, 91].forEach((n, i) => tone(NOTE(n), 0.2, { vol: 0.07, at: 0.2 + i * 0.06 }));
  }),
  error: play(() => tone(160, 0.18, { type: 'square', vol: 0.05, slide: -40 })),
  open: play(() => tone(NOTE(76), 0.08, { type: 'triangle', vol: 0.05 })),
};

// A slow pentatonic music box.
function startMusic() {
  const scale = [60, 62, 64, 67, 69, 72, 74, 76];
  const chords = [[48, 55, 64], [45, 52, 60], [41, 48, 57], [43, 50, 59]];
  let step = 0;
  musicTimer = setInterval(() => {
    if (!ctx || ctx.state !== 'running') return;
    const chord = chords[Math.floor(step / 8) % chords.length];
    if (step % 8 === 0) chord.forEach((n) => tone(NOTE(n), 2.4, { vol: 0.25, attack: 0.3, dest: musicGain }));
    if (Math.random() < 0.7) {
      const n = scale[Math.floor(Math.random() * scale.length)];
      tone(NOTE(n + 12), 0.6, { type: 'triangle', vol: 0.35, dest: musicGain });
    }
    step++;
  }, 340);
}
