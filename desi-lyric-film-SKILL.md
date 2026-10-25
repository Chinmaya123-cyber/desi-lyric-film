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

---

# Appendix — reference files

_The sections below are the skill's `references/` folder, included here so this one file holds the whole skill. The template project (engine + tools) lives in the repo: https://github.com/Chinmaya123-cyber/desi-lyric-film_

---

<!-- references/atlabs-mcp.md -->
## Atlabs MCP — required

The character art is made through the Atlabs MCP ("Atlabs MiniTools"). The skill does not run without it.

### Connect

- **Claude Code with this plugin installed**: the plugin ships `.mcp.json` with the Atlabs server — run `/mcp`, pick
  **atlabs**, sign in with your Atlabs account.
- **Claude Code, manual**: `claude mcp add --transport http atlabs https://mcp.atlabs.ai/mcp`, then `/mcp` → atlabs → sign in.
- **Claude Desktop / claude.ai**: Settings → Connectors → Add custom connector → Name `Atlabs`, URL
  `https://mcp.atlabs.ai/mcp` → Add → Connect → sign in; enable it in the chat's tools menu.
- **Account**: https://app.atlabs.ai — generations spend credits (a full film: ~25–40 with Nano Banana 2.1).

Verify with `get_account` (shows the credit balance). Tools are often deferred: load them with ToolSearch
(`atlabs generate_image get_result start_upload get_account list_models`).

### Tools used

| tool | for |
|---|---|
| `start_upload` + `curl -X PUT --upload-file …` | upload the user's reference images (the PUT response has the `media_id`) |
| `generate_image` | every image; pass `reference_media_ids` for consistency |
| `get_result` | wait for a job; download `outputs[].url` with `curl -sL -o …` |
| `list_models tool=generate_image` | check models, aspect ratios, reference limits |
| `get_account` | connection check + credits |

If the PUT can't connect (sandboxed environment), use `upload_from_browser` instead.

### Models

| model id | best for |
|---|---|
| `nano_banana_2_1` | **default** — base from references and every edit (expressions, blinks, outfits, backgrounds); strongest identity consistency; ~1 credit |
| `gpt_image_2_5_sunburst` | turning a real photo into the illustrated style when Nano Banana keeps it too photographic; up to 16 references |
| `seedream_5_pro` | new props, full-scene plates, extra stickers at 2K; ~2 credits |

Aspect ratios: character base/expressions `2:3` or `3:4`; eye close-up band `16:9`; look cards `2:3`; props `1:1`/`16:9`.
Always submit independent jobs in parallel, then collect them.

---

<!-- references/character.md -->
## The character — consistent across every frame

Rule: **one base drawing; every other frame is an edit of that base** (same pose, crop and canvas), so frames swap like
stop-motion drawings and the face never drifts. Use Nano Banana 2.1 (`nano_banana_2_1`) for the base and all edits.

### Inputs

- **User reference images** (photos of themselves or a consenting person, or character art they own): upload each with
  `start_upload` and pass all as `reference_media_ids`. More references (outfits, colours, angles) = better identity.
- **Original character**: a short description (+ optional style reference image). Keep the design simple and iconic:
  big kohl-winged eyes, bindi, distinctive hair (loose / braid with marigolds), one signature accessory.

### Prompt shapes (adapt the words; keep the structure)

**Base** (2:3 or 3:4): "The SAME person as in the references … same face/hair … in a loose black-ink hand-drawn
illustration style, flat warm colours, rosy blush, kohl-winged almond eyes, small bindi … [outfit] … upper body, facing
the viewer / side-eye glance. Plain flat cream background, no doodles, no text, no shadow."
For an original character: "Use the reference ONLY for its illustration style. Draw a completely ORIGINAL … ".

**Expression edit** (reference = the base's media id): "Edit this exact illustration. Keep EVERYTHING identical (pose, hair,
clothes, jewellery, framing, line style, colours, cream background). Change only her eyes/expression: …"
| file suffix | expression |
|---|---|
| `` (base) | neutral / side-eye glance |
| `_front` | looking straight into the viewer, captivating, catchlights |
| `_half` | half closed, mid-blink |
| `_closed` | fully closed, lashes down |
| `_pain` | brows up and together, eyes brimming, one tear, lips pressed |
| `_relief` | eyes gently closed, dried tear line, soft calm smile |
| `_shy` | eyes lowered to the side, deeper blush, bashful smile |
| `_dream` | eyes looking up, star catchlights, lips parted in wonder |
| `_moved` | eyes closed in bliss, warm glowing smile, deeper blush |

**Eye close-up band** (16:9, reference = base): "Extreme close-up of this same person … a horizontal band from just above
the brows to just below the eyes … both eyes wide open looking straight at the viewer … bindi … strands of hair at the sides.
The band fills the whole width." Then edits of the band: `half`, `closed`, `tears`, `glance` (side-eye), `smoulder` (slow
half-lidded intense gaze).

**Look cards** (2:3, reference = the user's image or the base): "The same person in the same hand-drawn style … now in a
modern [outfit + colour] with [jewellery] … Background: flat [card colour] with [light colour] hand-drawn zigzag doodles
radiating around her head. Upper body." Make 4–6, each on a different palette background (orange, navy, teal, mustard,
magenta, green). Then a `closed` eyes edit of each card.

**Twirl** (3:4): "Same person and style, full figure twirling joyfully in a [flowy skirt/lehenga], skirt flaring in a circle,
one arm raised, laughing with eyes closed. Plain flat cream background."

### Processing (from the project root)

```bash
### expression set — base first, then name:suffix pairs; writes public/art/char/<set><suffix>.png on one canvas
.venv/bin/python -I tools/register_frames.py public/art/char main refs/gen/base.jpg refs/gen/front.jpg:_front refs/gen/half.jpg:_half …
.venv/bin/python -I tools/eye_anchor.py --set main public/art/char/main_front.png public/art/char/main_closed.png
### eye close-ups → public/art/char/cu_*.jpg (1920×1080), then their eye positions
.venv/bin/python -I tools/cu_plates.py refs/gen/cu.jpg half=refs/gen/cu_half.jpg closed=refs/gen/cu_closed.jpg tears=… glance=… smoulder=…
.venv/bin/python -I tools/eye_anchor.py --closeup
### look cards (name open closed …) → public/art/cards/, registered in src/character.json
.venv/bin/python -I tools/make_cards.py teal refs/gen/teal.jpg refs/gen/teal_c.jpg navy …
### twirl cut-out
.venv/bin/python -I tools/keyout.py public/art/char refs/gen/twirl.jpg && mv public/art/char/twirl.png public/art/char/twirl.png
```
Then edit `src/character.json`: each set lists `file`, `w`, `h` (cut-out size), `ex`, `ey` (from eye_anchor) and `faces`
(mood → file suffix; moods: neutral, front, glance, half, closed, pain, relief, shy, dream, moved). A missing mood falls back
to neutral. A second set (e.g. `black`) is used by heavy moods via `"set"` in a shot.

Check: contact-sheet everything (`tools/sheet.py`). Registered frames should report shift ≈ 0; if an edit changed the pose or
crop, regenerate it. Tell the user the models used and the credits spent.

---

<!-- references/lyrics-and-timing.md -->
## Lyrics and timing

### 1. Read the song
- `beatgrid.py` — per-second loudness bars, BPM (search 60–180, check octave alternatives: ballads 70–100, dance 115–155),
  beat phase `beats at first + k·beat`, downbeat guess, loudness jumps (drops).
- `structure.py` — chroma self-similarity: for each second, how strongly it repeats elsewhere. The highest, longest runs are
  the hook/refrain sections.
- `vocal_onsets.py` — syllable onsets from the centre-channel vocal band (harmonic part only, so drums don't trigger it).
  Works where transcription fails (fast singing). Save once for the whole song: `--from 0 --to <dur> --json refs/onsets.json`.
- `locate.py song clip` — if the user gives a reference clip, finds where it sits in the song (onset cross-correlation).

### 2. Pick the part
30–60 s around the most repeated vocal section. Start on a downbeat 2–4 beats before the first sung syllable (gives the doors
time to open); end on the breath before the next section. `cut_audio.sh song start end` writes `public/audio/song_cut.wav`
with a 0.2 s fade-in and a 2.2 s fade-out. **Video time = song time − start**; `--beat0` for the planner is
`(first beat in song) − start` wrapped into [0, beat).

### 3. Lyrics (automatic)
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

### 4. Slots
`lyrics.json` is an ordered list — the index is the **slot** a shot refers to (`"slot": 7`). Times are video seconds:
`times[i]` is when word i is sung; `t0` the first word; `t1` the end of the phrase.

---

<!-- references/shot-design.md -->
## Shot design — `src/film.json`

```json
{ "title": "…", "bpm": 93.02, "beatOffset": 0.0, "duration": 36.1, "audio": "audio/song_cut.wav",
  "stage": {"outer": "#00756C", "buti": "#FF7FAB", "field": "#F7B500"},
  "endClose": {"x": 1250, "y": 440},
  "shots": [ {"t": 0, "kind": "open", "slot": 0, "set": "main", "doors": [0.6, 1.75], "bg": "pink", "transition": "cut"}, … ] }
```
One shot per sung phrase; a shot lasts until the next shot's `t`. Start each shot on its phrase's first syllable
(`t = lyrics[slot].t0`), the first shot at 0. Common fields: `slot`, `bg` (a `BG` name or hex), `transition`
(`cut | iris | blink | slide | zoom | tear | spin`, + `ox, oy` for zoom), `refrain: true` (refrain lettering).

### Kinds
| kind | what happens | options |
|---|---|---|
| `open` | carved double doors fill the frame and swing open on the pickups; she's behind them; eyes open on the line's words; lyric behind her | `set`, `doors: [start, end]` (s) |
| `character` | her mood carries the line; big lyric behind her | `mood`: `calm` (`face`: neutral/front/glance), `shy` (hearts pulse on eighths), `pain` (cracks, darkened ground → `relief` + golden wash on `reliefWord`), `dream` (looks up, the world drifts away), `moved` (eyes close in bliss; glow, heart ripples and blooms on every word); `set` |
| `eyes` | her eye close-up: closed → half on word 1 → `gaze` on word 2 (`open/glance/smoulder/tears`), blinks before the cut; refrain curved along her eyelids | `gaze`, `then` (a following slot shown as a written line), `ending: "lower"` (lids lower, stars drift into the lashes) or `glanceOn` |
| `cards` | a different look card snaps in on every word (outfit + background change), small hearts, a blink on the last word | `cards: [names]`, `style`, `hearts` |
| `prop` | a poetic object carries the line | `prop`: `sunEye`, `peacockEye`, `lotusEye`, `starEye`, `galaxyEye` (eye props for refrains); `path` (ink road + diyas), `heartsMeet` (distance closing), `heartbeat`, `mandala` (giant one-word cry), `lotusDew`, `globe` (words orbit it), `shyStars`, `kintsugi` (a wound mended in gold) |
| `notes` | sargam/alaap: she twirls, then each note snaps a new look card; big syllables pop in | `notes: [{t, dev, rom, card?}]` (times in video s) |
| `end` | eyes open on the first word; later words flip to look cards; the film folds shut | `flips: [{word, card}]`, `set` |

### Story rules
- **She is the protagonist; her eyes are the motif.** Every refrain is an eye moment and no two in a row look the same
  (alternate close-up gazes with eye props).
- **Read for meaning, not literally.** Pain is on her face (never a literal wound on a body); touch/feeling is `moved`, not a
  hand on a heart; "the world forgotten" is `dream`; shyness is `shy` or the shy stars; distance closing is `heartsMeet`.
- **Fast lines** (≥ 3 words/s) are card flips — the outfit and background changing per word reads as energy.
- **Rhythm of shots**: alternate her (character/eyes/cards) with props; change background every shot; vary transitions
  (`blink` into eye shots).
- **Arc**: open (doors, her eyes open) → build (props + her moods) → peak (fast flips, sargam) → close (her alone, eyes,
  the frame folds shut).

---

<!-- references/style-guide.md -->
## Style guide — recreate the look exactly

The look: **Indian maximalism drawn by one hand.** Flat bold colour, loose black ink line, rosy blush, block-print
surround, a scalloped marigold frame that never cuts, paper cut-outs that re-register like stop motion, and
lettering that feels painted into the frame. Everything below is implemented in `template/src` — this is the spec
for changing it without breaking the look.

### 1. Palette (`src/theme.ts → C`)

**Indian accents** (the backbone)

| name | hex | use |
|---|---|---|
| Rani pink | `#E0218A` | lettering shadow/outline on dark grounds, dotted frame border, accents |
| Peach bud | `#FBC2A9` | Roman line on dark grounds, road, soft fills |
| Scarlet | `#E8323C` | pain cracks, sun, giant exclamation word, sparkles on light grounds |
| Marigold | `#F7B500` | the frame's field, refrain shadow, glow, gold |
| Peacock green | `#00756C` | stage surround, kohl swoosh under refrains |

**Indie two-colour pairs** (for props, rays, accents — always as pairs)

| pair | hexes |
|---|---|
| Green House × Flossy | `#116B09` × `#FF7FAB` |
| Kind Berry × Mellow | `#1F6BED` × `#F4FF1E` |
| Velvet Cherry × Taffy | `#6E1221` × `#E76290` |
| Hot Pink × Deep Red | `#FF4283` × `#C60707` |
| Hot Pink (magenta) × Mellow | `#FF1EC7` × `#F4FF1E` |
| Blue Vinyl × Taffy | `#0759A2` × `#E76290` |
| Muted Blue / Riviera | `#518DFF` / `#5196E8` (dew, water) |

**Ink & paper**: ink `#2A0812` · cream `#FFF4E2` · plum `#7A0F3D` · velvet `#6E1221`.

**Shot backgrounds (`BG`)** — the inner field changes every shot, taken from the character's look cards:
pink `#FDAFBD` · yellow `#EDB956` · orange `#F99763` · navy `#253B61` · teal `#227383` · magenta `#F44484` ·
green `#287A58` · marigold `#F7B500`. Mood → background: pain/dream/stars/galaxy → **navy**; shy/moved/opening → **pink**;
eye props → orange/navy/pink; path/sargam → marigold; flower/distance → teal; finale → yellow. Never the same twice in a row.

**Character looks / cards**: modern outfits (halter, satin wrap, V-neck, crop) in hot pink, magenta, coral, black, golden
yellow; Indian touches in the details — bindi (always), hoops/jhumkas/chandbalis, nath, maang tikka, marigolds in the hair.
Card backgrounds: flat paper colour + hand-drawn zigzag doodles in a contrasting light colour (cream/peach/gold).

### 2. The stage (never cuts)

- Surround: peacock `#00756C` with a block-print buti tile (120 px): four Flossy petals at 75 %, marigold centre dot,
  peach corner dots at 70 %. The tile shifts one notch **per beat** (re-placed paper).
- Frame: a scalloped superellipse cartouche, centre (960, 540), half-axes **850 × 478**, 46 lobes, exponent 5.
  Field = shot background. Faint mandala inside at 10 % multiply, rotating 0.05°/frame.
- Edge (drawn over the shots): cream 12 px stroke (+4 px on each beat), rani dotted line inset 18 px (`0 18` dash, round
  caps, 6 px), velvet hairline outset 16 px at 60 %. All shots are clipped to the inner cartouche.

### 3. Typography

**Fonts**: Devanagari display = **Yatra One** (brushy hand-lettered); handwritten lines and Roman = **Kalam 700**.
(`@remotion/google-fonts`; never system fonts.)

**Two looks only** (one lettering artist):
| | light ground | dark ground |
|---|---|---|
| refrain (TN) | fill plum `#7A0F3D`, outline/shadow marigold, lit word rani, Roman velvet | fill cream, outline/shadow rani, lit word marigold, Roman peach |
| other lines (LN) | fill velvet, outline/shadow rani, lit word scarlet, Roman plum | fill peach, outline/shadow rani, lit word marigold, Roman cream |

Dark = luminance < 120 (auto). **Outline is a hairline** (`max(1.5, size/60)` px Devanagari, `max(1.2, size/40)` Roman) in
the shadow colour, `paint-order: stroke fill`; **one offset shadow** of `size/26` px (risograph misregistration). Never a
thick black border. A **dry-brush mask** (`art/brush.png`, 180 px tile) speckles every letter.

**Sizes**: refrain 150–230 px; lines 110–190 px; Roman ≈ 0.42 × Devanagari (30–58 px); long lines shrink to fit and wrap to
two rows growing away from the nearest frame edge (top lines grow down, bottom lines grow up).

**Placement**: behind the character in her shots (x 720–760, y 470 — she overlaps the letters like a magazine cover);
top (y 205) or bottom (y 900) in prop shots; left (x 520) when a look card is on the right; along the eyelids in eye close-ups.

**Animation styles** (`Lyric style=…`):
| style | motion | used for |
|---|---|---|
| slam | pop 0→1.18→0.94→1 over 6 frames with squash/stretch; lit word 1.08× | refrains |
| write | left→right handwriting wipe per word (6 frames), rises 14 px | ordinary lines |
| soft | slower wipe (10 frames) + fade | tender lines, finale |
| pulse | words throb on eighth notes (+12 %) and jitter 3 px | heartbeat / racing lines |
| converge | words slide in from far apart and meet | distance closing |
| bounce | words drop in and bounce | playful lines |
| twinkle | write + pink glow pulsing | stars / shy |
| giant | one word grows 0.55→1 over 30 frames, wobbling | exclamations |
| arc | words ride a circle around the subject, rotating 14°/s | world / orbit |
| EyeRing | Devanagari curves over one upper eyelid, Roman under the other; breathes with the beat | refrains on eye close-ups |

Every word appears **on its own sung syllable** (snapped onset), jitters ±2.5 px / ±2.5° every 4 frames (low-fps hand feel),
and at the end of the shot scatters up and away with a spin (last 8 frames). A kohl-wing swoosh draws under refrains in prop shots.

### 4. Motion — the stop-motion feel

- 24 fps; **drawings on twos** (12 drawings/s): every illustration, jitter and doodle uses the twos clock `t`.
  Camera push and transitions run **on ones** (`f`) so they glide.
- **Line boil**: whole frame through an SVG displacement filter — fractal noise, base frequency 0.018, 2 octaves, scale 5 —
  cycling 4 fixed filters (seeds 1–4) every 2 frames. Seeds must start at 1.
- **Paper grain**: fractal noise 0.85, multiply at 22 %, 6-seed cycle on twos, plus a soft velvet vignette.
- **Paper cut-out**: 3 px cream edge (four drop-shadows) + a hard 9/11 px shadow at 30 % velvet; re-registration jitter
  ±2.5 px and ±0.25° every 4 frames.
- **Beat**: camera kick +1.6 % on every beat (decays over a third of a beat); frame stroke +4 px; slow push 5–8 % per shot.
- **Stop-motion eyes**: blinks/opens are drawing swaps (open → half → closed, 2 frames each), never a scale squash on the character.
- **Pen-outline reveal** (Sketch): an ink ring (morphology dilate − erode of the cut-out's alpha) is drawn around the subject
  by a conic sweep over 6–12 frames, then the colour fills in.
- **Doodles**: 9 hand-drawn zigzag rays around her head (cream on light grounds, gold on dark), they kick on words/beats.
- **Transitions** (8 frames, eased): `blink` (almond eye-shaped wipe — use into eye shots), `iris` (scalloped flower),
  `zoom` (from a point, with rotation), `tear` (torn-paper edge), `slide` (paper slides in with a shadow), `spin`, `cut`.
  Shots start 4 frames early so the wipe completes on the syllable.
- **Finale**: in the last ~0.85 s the whole stage folds shut into a flower around her face.

### 5. Illustration style (for any new art)

Loose expressive black ink linework, flat warm colours, simple hand shading, heavy rosy blush, kohl-winged almond eyes,
gouache/risograph paper texture; isolated on a **plain flat cream background** for cut-outs (so they key cleanly) — never
drop shadows or text in the art. Props stay in the same palette: marigolds, jasmine, roses, petals, lotus, diya, peacock
feather, mandala, moon, stars, globe.

---

<!-- references/render-deliver.md -->
## Review, render, deliver

### Review before the full render
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

### Render
```bash
./tools/make_film.sh <name>       # out/<name>.mp4 — 1920×1080, 24 fps, CRF 17, AAC 256k, loudness −14 LUFS
```
~4–6 minutes for 40 s on an M-series Mac (concurrency 6, installed Chrome). Then verify: duration, a frame-difference check of
the first second (no frozen start), and a contact sheet of the final file.

### Deliver
Copy to `~/Downloads/<Song>-lyric-film-16x9.mp4`, reveal it, and send it. Say which models made the art and the credits used.
Note once that songs can be muted on some platforms and that publishing rights are the user's responsibility.
