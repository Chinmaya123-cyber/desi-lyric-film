# Style guide — recreate the look exactly

The look: **Indian maximalism drawn by one hand.** Flat bold colour, loose black ink line, rosy blush, block-print
surround, a scalloped marigold frame that never cuts, paper cut-outs that re-register like stop motion, and
lettering that feels painted into the frame. Everything below is implemented in `template/src` — this is the spec
for changing it without breaking the look.

## 1. Palette (`src/theme.ts → C`)

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

## 2. The stage (never cuts)

- Surround: peacock `#00756C` with a block-print buti tile (120 px): four Flossy petals at 75 %, marigold centre dot,
  peach corner dots at 70 %. The tile shifts one notch **per beat** (re-placed paper).
- Frame: a scalloped superellipse cartouche, centre (960, 540), half-axes **850 × 478**, 46 lobes, exponent 5.
  Field = shot background. Faint mandala inside at 10 % multiply, rotating 0.05°/frame.
- Edge (drawn over the shots): cream 12 px stroke (+4 px on each beat), rani dotted line inset 18 px (`0 18` dash, round
  caps, 6 px), velvet hairline outset 16 px at 60 %. All shots are clipped to the inner cartouche.

## 3. Typography

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

## 4. Motion — the stop-motion feel

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

## 5. Illustration style (for any new art)

Loose expressive black ink linework, flat warm colours, simple hand shading, heavy rosy blush, kohl-winged almond eyes,
gouache/risograph paper texture; isolated on a **plain flat cream background** for cut-outs (so they key cleanly) — never
drop shadows or text in the art. Props stay in the same palette: marigolds, jasmine, roses, petals, lotus, diya, peacock
feather, mandala, moon, stars, globe.
