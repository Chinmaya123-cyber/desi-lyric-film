---
name: desi-lyric-film
description: Make a 16:9 hand-drawn, Indian-maximalist lyric music video for any song — stop-motion character animation, a persistent ornate frame, word-synced kinetic Devanagari + Roman lyrics, and an eye moment on every refrain. Lyrics are extracted from the user's own audio automatically; the character (from the user's reference images or an original design) is built with the Atlabs MCP using Nano Banana 2.1, GPT Image 2.5 Sunburst or Seedream 5, kept consistent across expressions, outfits and colour-palette looks. Use when someone wants a "lyrical video", "lyric music video", "animated lyrics", "hand-drawn music video", "desi / Bollywood / Hindi song animation", "kinetic typography for a song", "illustrated reel for this song", or shares a song plus a character or reference video in this style. REQUIRES the Atlabs MCP — the skill stops and walks the user through connecting it if it is missing.
---

# Desi lyric film

Turn a song (the user's own audio file) into a 16:9 lyric film in one consistent hand-drawn style:
an illustrated character carries the emotion of each line, every refrain is an eye moment, lyrics are
written word-by-word in Devanagari with the Roman line under it, every cut lands on a sung syllable, and
the whole thing moves like stop motion (drawings on twos, boiling ink lines, paper cut-outs).

`template/` is a complete, tested Remotion project with a data-driven engine. You never hand-code a film:
you produce three JSON files and the engine renders them.

| file | what it holds | made by |
|---|---|---|
| `src/lyrics.json` | one entry per sung phrase: `{t0, t1, dev[], rom[], times[]}` | `tools/transcribe_lyrics.py` → `tools/build_lyrics.py` |
| `src/character.json` | expression sets + eye anchors, eye close-up plates, look cards, twirl | Atlabs MCP + `tools/register_frames.py`, `eye_anchor.py`, `cu_plates.py`, `make_cards.py` |
| `src/film.json` | the shot list (kind, start, lyric slot, background, transition, options) | `tools/plan_shots.py`, then you refine by meaning |

Read the references as you reach each step:
`references/atlabs-mcp.md` · `references/character.md` · `references/lyrics-and-timing.md` ·
`references/shot-design.md` · `references/style-guide.md` (exact palette, typography, motion spec) ·
`references/render-deliver.md`.

## 0. Hard rule — the Atlabs MCP must be connected first

All character art (base design, expressions, eye close-ups, outfit/colour looks) is generated through the
**Atlabs MCP**. There is no fallback: if it is not connected, **stop and do nothing else** until it is.

Check: search with ToolSearch for `atlabs generate_image get_result start_upload get_account` (tools are named
`mcp__atlabs__…` or `mcp__<id>__…` and are often deferred), then call `get_account` — it returns the credit balance.

If the tools are missing or `get_account` fails, reply with exactly these steps and wait:

> This skill makes the character art with the **Atlabs MCP**, so it needs to be connected first (about a minute):
> 1. **No Atlabs account yet?** Sign up at https://app.atlabs.ai (image generation uses Atlabs credits; a full film needs roughly 25–40).
> 2. **Connect it:**
>    - **Claude Code, installed as this plugin:** Atlabs is bundled — type `/mcp`, choose **atlabs**, sign in.
>    - **Claude Code (terminal):** run `claude mcp add --transport http atlabs https://mcp.atlabs.ai/mcp`, then `/mcp` → **atlabs** → sign in.
>    - **Claude Desktop / claude.ai:** Settings → Connectors → **Add custom connector** → Name `Atlabs`, URL `https://mcp.atlabs.ai/mcp` → **Add** → **Connect** → sign in, then enable it for this chat.
> 3. Tell me when it's connected and I'll start.

## 1. Brief — ask, don't assume

Ask with AskUserQuestion (one round, then proceed on sensible defaults):

1. **The song**: an audio file they have (mp3/wav/m4a). Never download music yourself.
2. **Which part**: "pick the hook for me" (default, 30–60 s) or their timestamps, or a reference clip to match (`tools/locate.py` finds a clip inside the song).
3. **The character** — offer:
   - **"Use my reference images"** — photos of themselves or of someone who agreed to it, or character art they have the rights to.
     They can share several (different outfits, colour backgrounds, expressions); every one is useful. Do not stylise a
     celebrity or any real person without their consent — offer an original character instead.
   - **"Design an original character"** — optionally from a style reference image and a short description (look, outfit vibe).
4. **Vibe words** (optional): e.g. "desi baddie Gen-Z", "soft romantic", "festive", "heartbreak". Default: modern desi with Indian accents.

If they share images in chat that are not files on disk, ask them to save them into `refs/cards/` (or give paths) —
uploads to Atlabs need files.

## 2. Scaffold

```bash
cp -R <skill dir>/template <project> && cd <project>
npm install
uv venv -q --python 3.12 .venv && uv pip install --python .venv/bin/python numpy scipy pillow faster-whisper
mkdir -p refs && cp <song> refs/song.mp3
```
(`python3.12 -m venv .venv` works too.) Run every Python tool as `.venv/bin/python -I tools/<tool>.py …` from the project root.
The template ships with a demo character, props and demo data so `npx remotion studio src/index.ts` works immediately.

## 3. Read the song, pick the part, cut the audio — `references/lyrics-and-timing.md`

```bash
.venv/bin/python -I tools/beatgrid.py refs/song.mp3 --bpm-min 60 --bpm-max 180      # tempo, beat phase, loudness bars
.venv/bin/python -I tools/structure.py refs/song.mp3                                 # repeated sections = hooks
.venv/bin/python -I tools/vocal_onsets.py refs/song.mp3 --from 0 --to <dur> --json refs/onsets.json
tools/cut_audio.sh refs/song.mp3 <start> <end>                                        # → public/audio/song_cut.wav
```
Pick the most repeated, most energetic vocal section (the refrain lives there). Start on a downbeat 2–4 beats before the
first vocal, end on a breath before the next section. Note `start` — video time = song time − start.

## 4. Lyrics — automatic, from the user's own audio

```bash
.venv/bin/python -I tools/transcribe_lyrics.py refs/song.mp3 --from <start> --to <end> --lang hi --onsets refs/onsets.json
.venv/bin/python -I tools/build_lyrics.py --transcript refs/transcript.json --slice <start> <end> --onsets refs/onsets.json
```
- `--lang hi` returns Devanagari, `--lang en` romanised Hinglish; `build_lyrics.py` writes both scripts.
- If the transcriber reports **unread sung stretches** (very fast singing, layered vocals), ask once whether the user has the
  lyrics as text or a timestamped table; if yes: `build_lyrics.py --table lyrics.txt …` (or `--text`). If not, keep going:
  those phrases stay wordless and the planner gives them visual-only shots.
- **Lyrics only ever come from the user's audio via the transcriber or from text the user provides.** Never type song lyrics
  yourself, never fill gaps from memory, and don't echo the lyric text back in chat — report counts and timings.

## 5. The character — Atlabs MCP — `references/character.md`

One base drawing, everything else is an **edit of that base**, so the character never drifts. Default models:
**Nano Banana 2.1** (`nano_banana_2_1`) for the base-from-reference and every edit (best consistency);
**GPT Image 2.5 Sunburst** (`gpt_image_2_5_sunburst`) when a photo needs a stronger stylisation pass;
**Seedream 5 Pro** (`seedream_5_pro`) for new props or full-scene plates.

1. Base: clean, upper-body, plain cream background, in the style (references or original).
2. Expressions (edits of the base): `front, half, closed, pain, relief, shy, dream, moved` (+ the base as `neutral`/side-eye).
   `register_frames.py` puts them on one canvas; `eye_anchor.py --set main …` finds her eyes.
3. Optional second look (e.g. a darker outfit) with `front, half, closed, pain, relief, dream` → used for heavy moods.
4. Eye close-up band + edits `half, closed, tears, glance, smoulder` → `cu_plates.py`, then `eye_anchor.py --closeup`.
5. 4–6 **look cards**: the same person, different modern outfit + flat colour background from the palette + doodles,
   each with a closed-eye edit → `make_cards.py`.
6. A full-figure twirl → `keyout.py`.
Submit independent generations in parallel; contact-sheet with `sheet.py` and look before moving on. Tell the user the
models used and credits spent.

## 6. Plan the film — `references/shot-design.md`

```bash
.venv/bin/python -I tools/plan_shots.py --bpm <bpm> --beat0 <first beat, video s> --duration <s> --audio audio/song_cut.wav
```
Then **read every line's meaning** (from the files, without pasting lyrics into chat) and refine `src/film.json`:
- every refrain is an eye moment (her close-up with a different gaze each time, or an eye prop); never the same twice in a row
- pain is on her face (cracks, darkened ground) and relief arrives on the healing word — never a literal wound
- touch/feeling is "moved" (blooms, ripples), not a literal hand-on-heart; fast lines are look-card flips
- the backgrounds change every shot (look colours), the frame never changes; transitions vary
Keep one coherent story: she is the protagonist, her eyes are the motif.

## 7. Review, then render — `references/render-deliver.md`

```bash
node tools/stills.mjs out/st 0.5 <frames…> && .venv/bin/python -I tools/sheet.py out/st.jpg out/st/*.jpg
./tools/make_film.sh <name>                     # → out/<name>.mp4 (1920×1080, 24 fps)
```
Check stills at the first word of every phrase: lyric legible and inside the frame, eyes open on refrains, expressions match
the line, no empty shots. Fix, re-render the changed frames, then render the film (~4–6 min). Copy the result to the user's
Downloads and send it. Mention once: a commercial song may be muted on some platforms; it's their responsibility to have the
rights to publish it.

## Gotchas (from real runs)
- feTurbulence treats seed 0 and 1 as the same pattern — boil/grain seeds start at 1 (already fixed in `kit.tsx`); otherwise the
  opening holds still for 4 frames and then jumps.
- Whisper misses very fast singing; the onsets still time those phrases — never guess the words.
- Remotion's bundled headless shell can crash on macOS; `remotion.config.ts` uses installed Chrome. Keep concurrency at 6.
- Registered edits must come from the same base image; if an edit drifts (different pose/crop), regenerate it rather than forcing it.
- Text on dark backgrounds switches to the cream/peach lettering automatically — pick shot backgrounds by mood, not by text.
