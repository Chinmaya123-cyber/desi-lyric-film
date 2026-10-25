# Template — desi lyric film engine

A Remotion project that renders a lyric film from three files:
`src/film.json` (shots) · `src/lyrics.json` (word-timed lines) · `src/character.json` (character art manifest).
It ships with demo data (an original character, four look cards, original demo lines) so it renders immediately:

```bash
npm install
npx remotion studio src/index.ts        # preview
./tools/make_film.sh demo               # → out/demo.mp4
```
Tools (`tools/`): `beatgrid.py`, `structure.py`, `vocal_onsets.py`, `locate.py`, `cut_audio.sh` (song) ·
`transcribe_lyrics.py`, `build_lyrics.py` (lyrics) · `register_frames.py`, `keyout.py`, `eye_anchor.py`, `cu_plates.py`,
`make_cards.py` (character) · `plan_shots.py` (shot list) · `stills.mjs`, `sheet.py`, `make_film.sh`, `fix_blank_frames.py` (review/render).
See `../SKILL.md` for the workflow.
