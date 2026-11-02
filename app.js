import { detectPitch, rms } from './pitch.js';
import { INSTRUMENTS, findTuning } from './tunings.js';

let tuning = findTuning(safeGet('tuning'));
let STRINGS = tuning.strings;
let range = { minFreq: 60, maxFreq: 1000 };
const IN_TUNE = 3;   // cents
const CLOSE = 12;    // cents
const GATE = 0.01;   // RMS noise gate

const $ = (id) => document.getElementById(id);
const el = {
  display: document.querySelector('.display'), needle: $('needle'), note: $('note'), octave: $('octave'),
  status: $('status'), freq: $('freq'), cents: $('cents'), target: $('target'),
  strings: $('strings'), start: $('start'), tuning: $('tuning'), sub: $('sub'), auto: $('auto'), a4: $('a4'), tone: $('tone'),
};

let a4 = Number(safeGet('a4')) || 440;
let selected = 0;
let ctx, analyser, buf, stream, running = false;
let history = [];
let lastHeard = 0;
const tunedAt = new Map();

const freqOf = (midi) => a4 * Math.pow(2, (midi - 69) / 12);
const centsOff = (f, ref) => 1200 * Math.log2(f / ref);

function safeGet(k) { try { return localStorage.getItem(k); } catch { return null; } }
function safeSet(k, v) { try { localStorage.setItem(k, v); } catch {} }

// --- Build UI ---
(function drawTicks() {
  const g = $('ticks');
  for (let c = -50; c <= 50; c += 5) {
    const major = c % 25 === 0;
    const a = (c / 50) * 60 * Math.PI / 180;
    const r1 = 126, r2 = major ? 108 : 116;
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', 150 + r1 * Math.sin(a)); line.setAttribute('y1', 160 - r1 * Math.cos(a));
    line.setAttribute('x2', 150 + r2 * Math.sin(a)); line.setAttribute('y2', 160 - r2 * Math.cos(a));
    line.setAttribute('class', major ? 'tick major' : 'tick');
    g.appendChild(line);
  }
})();

INSTRUMENTS.forEach((inst) => {
  const g = document.createElement('optgroup');
  g.label = inst.name;
  inst.tunings.forEach(([id, name, spec]) => {
    const o = document.createElement('option');
    o.value = `${inst.id}:${id}`;
    o.textContent = `${name} — ${spec.split('|')[0].trim().replace(/\d/g, '').replace(/#/g, '♯').replace(/(?<=[A-G])b/g, '♭')}`;
    g.appendChild(o);
  });
  el.tuning.appendChild(g);
});
el.tuning.onchange = () => applyTuning(el.tuning.value);

function applyTuning(key) {
  tuning = findTuning(key);
  STRINGS = tuning.strings;
  el.tuning.value = tuning.key;
  safeSet('tuning', tuning.key);
  el.sub.textContent = `${tuning.inst.name} · ${tuning.name}`;
  const freqs = STRINGS.map((s) => freqOf(s.midi));
  // Detection range follows the instrument: allow strings to start well flat/sharp.
  range = { minFreq: Math.min(...freqs) * 0.7, maxFreq: Math.min(1000, Math.max(...freqs) * 2.5) };
  sizeAnalyser();
  el.strings.innerHTML = '';
  const main = STRINGS.filter((s) => !s.label.endsWith('pair')).length;
  el.strings.style.setProperty('--cols', main);
  STRINGS.forEach((s, i) => {
    const b = document.createElement('button');
    b.innerHTML = `${s.name}<small>${s.label}</small>`;
    b.title = s.title;
    b.onclick = () => { selected = i; el.auto.checked = false; history = []; renderStrings(); updateTarget(); };
    el.strings.appendChild(b);
  });
  selected = 0; history = []; tunedAt.clear();
  renderStrings(); updateTarget();
}

function sizeAnalyser() {
  if (!analyser) return;
  // Window must hold at least two periods of the lowest note.
  const need = (2.2 * ctx.sampleRate) / range.minFreq;
  let size = 4096;
  while (size < need && size < 32768) size *= 2;
  analyser.fftSize = size;
  buf = new Float32Array(size);
}

function renderStrings() {
  [...el.strings.children].forEach((b, i) => {
    b.classList.toggle('active', i === selected);
    b.classList.toggle('done', tunedAt.has(i));
  });
}
function updateTarget() {
  const s = STRINGS[selected];
  el.target.textContent = `${s.name}${s.oct} ${freqOf(s.midi).toFixed(2)} Hz`;
}
function setA4(v) {
  a4 = Math.min(450, Math.max(430, v));
  el.a4.textContent = a4;
  safeSet('a4', a4);
  tunedAt.clear(); renderStrings(); updateTarget();
}
$('calDown').onclick = () => setA4(a4 - 1);
$('calUp').onclick = () => setA4(a4 + 1);
el.auto.onchange = () => { history = []; };
applyTuning(tuning.key);
setA4(a4);

// --- Audio ---
el.start.onclick = async () => {
  if (running) return stop();
  try {
    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
    await ctx.resume();
    stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
    });
    const src = ctx.createMediaStreamSource(stream);
    analyser = ctx.createAnalyser();
    src.connect(analyser);
    sizeAnalyser();
    running = true;
    el.start.textContent = 'Stop';
    el.status.textContent = 'Listening… pluck a string';
    requestAnimationFrame(loop);
  } catch (err) {
    el.status.textContent = err.name === 'NotAllowedError'
      ? 'Microphone access was blocked. Allow it in your browser settings.'
      : `Couldn't open the microphone: ${err.message}`;
  }
};

function stop() {
  running = false;
  stream?.getTracks().forEach((t) => t.stop());
  el.start.textContent = 'Start';
  el.status.textContent = 'Stopped';
  el.display.classList.remove('in-tune', 'close', 'far');
}

function median(a) { const s = [...a].sort((x, y) => x - y); return s[s.length >> 1]; }

function loop(now) {
  if (!running) return;
  analyser.getFloatTimeDomainData(buf);
  const level = rms(buf);
  const r = level > GATE ? detectPitch(buf, ctx.sampleRate, range) : null;

  if (r && r.clarity > 0.85) {
    history.push(r.freq);
    if (history.length > 5) history.shift();
    // Drop history if the pitch jumped (new string plucked)
    if (history.length > 1 && Math.abs(centsOff(r.freq, history[history.length - 2])) > 80) history = [r.freq];
    lastHeard = now;
    show(median(history));
  } else if (now - lastHeard > 1200) {
    history = [];
    idle();
  }
  requestAnimationFrame(loop);
}

function show(f) {
  if (el.auto.checked) {
    let best = 0, bestAbs = Infinity;
    STRINGS.forEach((s, i) => { const c = Math.abs(centsOff(f, freqOf(s.midi))); if (c < bestAbs) { bestAbs = c; best = i; } });
    if (best !== selected) { selected = best; renderStrings(); updateTarget(); }
  }
  const s = STRINGS[selected];
  const c = centsOff(f, freqOf(s.midi));
  const clamped = Math.max(-50, Math.min(50, c));
  el.needle.setAttribute('transform', `rotate(${(clamped / 50) * 60} 150 160)`);
  el.note.textContent = s.name;
  el.octave.textContent = s.oct;
  el.freq.textContent = `${f.toFixed(2)} Hz`;
  el.cents.textContent = `${c >= 0 ? '+' : ''}${c.toFixed(1)} ¢`;

  const abs = Math.abs(c);
  el.display.classList.toggle('in-tune', abs <= IN_TUNE);
  el.display.classList.toggle('close', abs > IN_TUNE && abs <= CLOSE);
  el.display.classList.toggle('far', abs > CLOSE);

  if (abs <= IN_TUNE) {
    el.status.textContent = 'In tune ✓';
    if (!tunedAt.has(selected)) { tunedAt.set(selected, Date.now()); renderStrings(); navigator.vibrate?.(40); }
  } else if (abs > 300) {
    el.status.textContent = c < 0 ? 'Way too low, tighten a lot' : 'Way too high, loosen a lot';
  } else {
    el.status.textContent = c < 0 ? 'Too low, tighten ↑' : 'Too high, loosen ↓';
  }
}

function idle() {
  el.display.classList.remove('in-tune', 'close', 'far');
  el.needle.setAttribute('transform', 'rotate(0 150 160)');
  el.freq.textContent = '— Hz';
  el.cents.textContent = '— ¢';
  el.status.textContent = 'Listening… pluck a string';
}

// --- Reference tone ---
el.tone.onclick = async () => {
  ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
  await ctx.resume();
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.value = freqOf(STRINGS[selected].midi);
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(0.35, t + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 2.5);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t); osc.stop(t + 2.6);
};

if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
