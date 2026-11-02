// node test-pitch.mjs — checks detection on synthetic guitar-like tones
import { detectPitch } from './pitch.js';
const sr = 48000;
// [freq, buffer size, options] — guitar defaults, then bass range as the app configures it
const cases = [
  ...[82.41, 110, 146.83, 196, 246.94, 329.63, 85.0, 438.2, 65.41, 61.74, 55.0].map((f) => [f, 4096, { minFreq: 40 }]),
  ...[30.87, 41.2, 55.0, 73.42, 98.0].map((f) => [f, 8192, { minFreq: 21.6, maxFreq: 245 }]),
];
let fail = 0;
for (const [f, N, opts] of cases) {
  const buf = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const t = i / sr;
    // fundamental + strong harmonics, like a plucked string
    buf[i] = 0.5*Math.sin(2*Math.PI*f*t) + 0.8*Math.sin(2*Math.PI*2*f*t) + 0.4*Math.sin(2*Math.PI*3*f*t) + 0.2*Math.sin(2*Math.PI*4*f*t) + 0.02*(Math.random()-0.5);
  }
  const r = detectPitch(buf, sr, opts);
  const cents = r ? 1200*Math.log2(r.freq/f) : NaN;
  const ok = Math.abs(cents) < 1;
  if (!ok) fail++;
  console.log(`${f.toFixed(2)} Hz -> ${r ? r.freq.toFixed(2) : 'null'} Hz (${cents.toFixed(2)} cents) ${ok ? 'OK' : 'FAIL'}`);
}
process.exit(fail ? 1 : 0);
