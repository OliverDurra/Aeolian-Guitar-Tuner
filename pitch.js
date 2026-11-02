// YIN pitch detection (de Cheveigné & Kawahara, 2002).
// Returns { freq, clarity } or null when no clear periodic signal is found.
export function detectPitch(buf, sampleRate, { minFreq = 60, maxFreq = 1000, threshold = 0.12 } = {}) {
  const tauMin = Math.max(2, Math.floor(sampleRate / maxFreq));
  const tauMax = Math.min(Math.floor(sampleRate / minFreq), Math.floor(buf.length / 2));
  const W = buf.length - tauMax;
  const d = new Float32Array(tauMax + 1);

  // Difference function
  for (let tau = 1; tau <= tauMax; tau++) {
    let s = 0;
    for (let i = 0; i < W; i++) {
      const x = buf[i] - buf[i + tau];
      s += x * x;
    }
    d[tau] = s;
  }

  // Cumulative mean normalized difference
  d[0] = 1;
  let running = 0;
  for (let tau = 1; tau <= tauMax; tau++) {
    running += d[tau];
    d[tau] = running ? (d[tau] * tau) / running : 1;
  }

  // Absolute threshold: first dip below threshold, then walk to its local minimum
  let tau = -1;
  for (let t = tauMin; t <= tauMax; t++) {
    if (d[t] < threshold) {
      while (t + 1 <= tauMax && d[t + 1] < d[t]) t++;
      tau = t;
      break;
    }
  }
  if (tau < 0) return null;

  // Parabolic interpolation for sub-sample accuracy
  let refined = tau;
  if (tau > 1 && tau < tauMax) {
    const s0 = d[tau - 1], s1 = d[tau], s2 = d[tau + 1];
    const denom = s0 + s2 - 2 * s1;
    if (denom !== 0) refined = tau + (s0 - s2) / (2 * denom);
  }
  return { freq: sampleRate / refined, clarity: 1 - d[tau] };
}

export function rms(buf) {
  let s = 0;
  for (let i = 0; i < buf.length; i++) s += buf[i] * buf[i];
  return Math.sqrt(s / buf.length);
}
