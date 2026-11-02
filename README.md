# Aeolian Guitar Tuner

A chromatic tuner for a 6-string guitar in standard tuning (E A D G B E). It runs in the browser and listens through your microphone.

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
