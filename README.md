# Aeolian Guitar Tuner

A tuner for guitar and bass that runs in the browser and listens through your microphone.

**Instruments and tunings**
- 6-string guitar: Standard, Drop D, Double drop D, Half step down, Whole step down, Drop C♯, Drop C, DADGAD, Open G, Open D, Open E, Open A, Open C
- 7-string guitar: Standard, Drop A
- 12-string guitar: Standard, Drop D (octave and unison pairs tuned individually)
- 4-string bass: Standard, Drop D, Half step down
- 5-string bass: Standard (low B)

**Features**

- YIN pitch detection, accurate to under 0.1 cent on test tones
- Picks the string automatically, or tap a string to lock onto it
- Needle gauge with in-tune (±3¢) / close (±12¢) / off colors
- A4 calibration from 430 to 450 Hz
- Reference tone for tuning by ear
- Installable and works offline (PWA)

## Run
Microphone access needs HTTPS or localhost:

```bash
python3 -m http.server 8000
```
Then open http://localhost:8000. To use it on your phone, turn on GitHub Pages (Settings → Pages → branch `main`, folder `/`).

## Test
```bash
node test-pitch.mjs
```
