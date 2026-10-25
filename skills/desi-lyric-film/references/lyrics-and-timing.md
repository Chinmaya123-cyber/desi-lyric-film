# Lyrics and timing

## 1. Read the song
- `beatgrid.py` — per-second loudness bars, BPM (search 60–180, check octave alternatives: ballads 70–100, dance 115–155),
  beat phase `beats at first + k·beat`, downbeat guess, loudness jumps (drops).
- `structure.py` — chroma self-similarity: for each second, how strongly it repeats elsewhere. The highest, longest runs are
  the hook/refrain sections.
- `vocal_onsets.py` — syllable onsets from the centre-channel vocal band (harmonic part only, so drums don't trigger it).
  Works where transcription fails (fast singing). Save once for the whole song: `--from 0 --to <dur> --json refs/onsets.json`.
- `locate.py song clip` — if the user gives a reference clip, finds where it sits in the song (onset cross-correlation).

## 2. Pick the part
30–60 s around the most repeated vocal section. Start on a downbeat 2–4 beats before the first sung syllable (gives the doors
time to open); end on the breath before the next section. `cut_audio.sh song start end` writes `public/audio/song_cut.wav`
with a 0.2 s fade-in and a 2.2 s fade-out. **Video time = song time − start**; `--beat0` for the planner is
`(first beat in song) − start` wrapped into [0, beat).

## 3. Lyrics (automatic)
`transcribe_lyrics.py` (faster-whisper, default `large-v3`, falls back to `medium`) → `refs/transcript.json` with word times.
`--lang hi` for Devanagari, `--lang en` for romanised Hindi/Hinglish, `--lang auto` otherwise; `--prompt` can bias spelling
with words the user supplies. It prints only counts and timings, plus **unread sung stretches** when given `--onsets`.

`build_lyrics.py` makes `src/lyrics.json`:
- `--transcript` — keeps only words that sit on a detected sung syllable (±0.35 s; Whisper invents words over instrumentals), splits long phrases at pauses (> 0.35 s or 7 words), snaps each word to its onset (±0.15 s). It flags isolated short phrases that may still be hallucinated; check the loudness bars / vocal onsets and drop them (`--drop-before <video s>` removes everything before the first real vocal).
- `--table` — a timestamped lyrics table the user provides (rows `mm:ss – mm:ss <lyrics>[TAB]<translation>`); each row is split
  into its sung parts (main line, `( … )` echoes, `…`-separated parts); descriptive rows (instrumental, sargam, alaap) are skipped.
- `--text` — plain lines in sung order.
Table/text lines are placed onto the sung phrases detected in the onsets (split/merged to match), words spread by syllables.
Devanagari ↔ Roman conversion is automatic (Hinglish rules: schwa deletion, nasal endings, common-word spellings); a line
`देवनागरी | roman` gives both explicitly.

Never type lyrics yourself or fill gaps from memory; never paste lyric text into chat. Unread stretches without user text
become visual-only shots.

## 4. Slots
`lyrics.json` is an ordered list — the index is the **slot** a shot refers to (`"slot": 7`). Times are video seconds:
`times[i]` is when word i is sung; `t0` the first word; `t1` the end of the phrase.
