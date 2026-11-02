// Notes are listed low → high. For 12-string, "|" separates the main row from the paired (octave/unison) row.
export const INSTRUMENTS = [
  { id: 'guitar6', name: '6-string guitar', tunings: [
    ['standard', 'Standard', 'E2 A2 D3 G3 B3 E4'],
    ['dropd', 'Drop D', 'D2 A2 D3 G3 B3 E4'],
    ['doubledropd', 'Double drop D', 'D2 A2 D3 G3 B3 D4'],
    ['halfdown', 'Half step down (E♭)', 'Eb2 Ab2 Db3 Gb3 Bb3 Eb4'],
    ['wholedown', 'Whole step down (D standard)', 'D2 G2 C3 F3 A3 D4'],
    ['dropcs', 'Drop C♯', 'C#2 G#2 C#3 F#3 A#3 D#4'],
    ['dropc', 'Drop C', 'C2 G2 C3 F3 A3 D4'],
    ['dadgad', 'DADGAD', 'D2 A2 D3 G3 A3 D4'],
    ['openg', 'Open G', 'D2 G2 D3 G3 B3 D4'],
    ['opend', 'Open D', 'D2 A2 D3 F#3 A3 D4'],
    ['opene', 'Open E', 'E2 B2 E3 G#3 B3 E4'],
    ['opena', 'Open A', 'E2 A2 E3 A3 C#4 E4'],
    ['openc', 'Open C', 'C2 G2 C3 G3 C4 E4'],
  ]},
  { id: 'guitar7', name: '7-string guitar', tunings: [
    ['standard', 'Standard', 'B1 E2 A2 D3 G3 B3 E4'],
    ['dropa', 'Drop A', 'A1 E2 A2 D3 G3 B3 E4'],
  ]},
  { id: 'guitar12', name: '12-string guitar', tunings: [
    ['standard', 'Standard', 'E2 A2 D3 G3 B3 E4 | E3 A3 D4 G4 B3 E4'],
    ['dropd', 'Drop D', 'D2 A2 D3 G3 B3 E4 | D3 A3 D4 G4 B3 E4'],
  ]},
  { id: 'bass4', name: '4-string bass', tunings: [
    ['standard', 'Standard', 'E1 A1 D2 G2'],
    ['dropd', 'Drop D', 'D1 A1 D2 G2'],
    ['halfdown', 'Half step down (E♭)', 'Eb1 Ab1 Db2 Gb2'],
  ]},
  { id: 'bass5', name: '5-string bass', tunings: [
    ['standard', 'Standard', 'B0 E1 A1 D2 G2'],
  ]},
];

const PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

export function parseNote(s) {
  const m = /^([A-G])([#b]?)(\d)$/.exec(s);
  if (!m) throw new Error(`Bad note ${s}`);
  const midi = (Number(m[3]) + 1) * 12 + PC[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  return { name: m[1] + (m[2] === '#' ? '♯' : m[2] === 'b' ? '♭' : ''), oct: Number(m[3]), midi };
}

const ord = (n) => n + (['st', 'nd', 'rd'][n - 1] || 'th');

// Returns strings in display order, each { name, oct, midi, label, title }
export function buildStrings(spec) {
  const [main, pair] = spec.split('|').map((r) => r.trim().split(/\s+/));
  const count = main.length;
  const out = main.map((n, i) => ({ ...parseNote(n), label: ord(count - i) }));
  if (pair) pair.forEach((n, i) => out.push({ ...parseNote(n), label: `${ord(count - i)} pair` }));
  return out.map((s) => ({ ...s, title: `${s.label} string: ${s.name}${s.oct}` }));
}

export function findTuning(key) {
  const [instId, tunId] = (key || '').split(':');
  const inst = INSTRUMENTS.find((i) => i.id === instId) || INSTRUMENTS[0];
  const t = inst.tunings.find((t) => t[0] === tunId) || inst.tunings[0];
  return { key: `${inst.id}:${t[0]}`, inst, name: t[1], strings: buildStrings(t[2]) };
}
