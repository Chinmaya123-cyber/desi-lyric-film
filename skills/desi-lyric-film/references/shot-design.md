# Shot design — `src/film.json`

```json
{ "title": "…", "bpm": 93.02, "beatOffset": 0.0, "duration": 36.1, "audio": "audio/song_cut.wav",
  "stage": {"outer": "#00756C", "buti": "#FF7FAB", "field": "#F7B500"},
  "endClose": {"x": 1250, "y": 440},
  "shots": [ {"t": 0, "kind": "open", "slot": 0, "set": "main", "doors": [0.6, 1.75], "bg": "pink", "transition": "cut"}, … ] }
```
One shot per sung phrase; a shot lasts until the next shot's `t`. Start each shot on its phrase's first syllable
(`t = lyrics[slot].t0`), the first shot at 0. Common fields: `slot`, `bg` (a `BG` name or hex), `transition`
(`cut | iris | blink | slide | zoom | tear | spin`, + `ox, oy` for zoom), `refrain: true` (refrain lettering).

## Kinds
| kind | what happens | options |
|---|---|---|
| `open` | carved double doors fill the frame and swing open on the pickups; she's behind them; eyes open on the line's words; lyric behind her | `set`, `doors: [start, end]` (s) |
| `character` | her mood carries the line; big lyric behind her | `mood`: `calm` (`face`: neutral/front/glance), `shy` (hearts pulse on eighths), `pain` (cracks, darkened ground → `relief` + golden wash on `reliefWord`), `dream` (looks up, the world drifts away), `moved` (eyes close in bliss; glow, heart ripples and blooms on every word); `set` |
| `eyes` | her eye close-up: closed → half on word 1 → `gaze` on word 2 (`open/glance/smoulder/tears`), blinks before the cut; refrain curved along her eyelids | `gaze`, `then` (a following slot shown as a written line), `ending: "lower"` (lids lower, stars drift into the lashes) or `glanceOn` |
| `cards` | a different look card snaps in on every word (outfit + background change), small hearts, a blink on the last word | `cards: [names]`, `style`, `hearts` |
| `prop` | a poetic object carries the line | `prop`: `sunEye`, `peacockEye`, `lotusEye`, `starEye`, `galaxyEye` (eye props for refrains); `path` (ink road + diyas), `heartsMeet` (distance closing), `heartbeat`, `mandala` (giant one-word cry), `lotusDew`, `globe` (words orbit it), `shyStars`, `kintsugi` (a wound mended in gold) |
| `notes` | sargam/alaap: she twirls, then each note snaps a new look card; big syllables pop in | `notes: [{t, dev, rom, card?}]` (times in video s) |
| `end` | eyes open on the first word; later words flip to look cards; the film folds shut | `flips: [{word, card}]`, `set` |

## Story rules
- **She is the protagonist; her eyes are the motif.** Every refrain is an eye moment and no two in a row look the same
  (alternate close-up gazes with eye props).
- **Read for meaning, not literally.** Pain is on her face (never a literal wound on a body); touch/feeling is `moved`, not a
  hand on a heart; "the world forgotten" is `dream`; shyness is `shy` or the shy stars; distance closing is `heartsMeet`.
- **Fast lines** (≥ 3 words/s) are card flips — the outfit and background changing per word reads as energy.
- **Rhythm of shots**: alternate her (character/eyes/cards) with props; change background every shot; vary transitions
  (`blink` into eye shots).
- **Arc**: open (doors, her eyes open) → build (props + her moods) → peak (fast flips, sargam) → close (her alone, eyes,
  the frame folds shut).
