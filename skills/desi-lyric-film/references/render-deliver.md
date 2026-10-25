# Review, render, deliver

## Review before the full render
```bash
node tools/stills.mjs out/st 0.5 <frame> <frame> …        # frame = round(seconds × 24)
.venv/bin/python -I tools/sheet.py out/st.jpg out/st/*.jpg
```
Pick a frame just after the first word of every phrase, plus the transitions. Check:
- the lyric is legible, inside the frame, not hidden by props (behind her is fine — she should only overlap part of it)
- refrains: eyes open on the second word; close-up lettering hugs the lids
- the expression matches the line; cards flip on words; doors fully cover the frame before opening
- no two neighbouring shots share a background
Fix `film.json` (or art), re-render only those frames.

## Render
```bash
./tools/make_film.sh <name>       # out/<name>.mp4 — 1920×1080, 24 fps, CRF 17, AAC 256k, loudness −14 LUFS
```
~4–6 minutes for 40 s on an M-series Mac (concurrency 6, installed Chrome). Then verify: duration, a frame-difference check of
the first second (no frozen start), and a contact sheet of the final file.

## Deliver
Copy to `~/Downloads/<Song>-lyric-film-16x9.mp4`, reveal it, and send it. Say which models made the art and the credits used.
Note once that songs can be muted on some platforms and that publishing rights are the user's responsibility.
