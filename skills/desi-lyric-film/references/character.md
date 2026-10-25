# The character — consistent across every frame

Rule: **one base drawing; every other frame is an edit of that base** (same pose, crop and canvas), so frames swap like
stop-motion drawings and the face never drifts. Use Nano Banana 2.1 (`nano_banana_2_1`) for the base and all edits.

## Inputs

- **User reference images** (photos of themselves or a consenting person, or character art they own): upload each with
  `start_upload` and pass all as `reference_media_ids`. More references (outfits, colours, angles) = better identity.
- **Original character**: a short description (+ optional style reference image). Keep the design simple and iconic:
  big kohl-winged eyes, bindi, distinctive hair (loose / braid with marigolds), one signature accessory.

## Prompt shapes (adapt the words; keep the structure)

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

## Processing (from the project root)

```bash
# expression set — base first, then name:suffix pairs; writes public/art/char/<set><suffix>.png on one canvas
.venv/bin/python -I tools/register_frames.py public/art/char main refs/gen/base.jpg refs/gen/front.jpg:_front refs/gen/half.jpg:_half …
.venv/bin/python -I tools/eye_anchor.py --set main public/art/char/main_front.png public/art/char/main_closed.png
# eye close-ups → public/art/char/cu_*.jpg (1920×1080), then their eye positions
.venv/bin/python -I tools/cu_plates.py refs/gen/cu.jpg half=refs/gen/cu_half.jpg closed=refs/gen/cu_closed.jpg tears=… glance=… smoulder=…
.venv/bin/python -I tools/eye_anchor.py --closeup
# look cards (name open closed …) → public/art/cards/, registered in src/character.json
.venv/bin/python -I tools/make_cards.py teal refs/gen/teal.jpg refs/gen/teal_c.jpg navy …
# twirl cut-out
.venv/bin/python -I tools/keyout.py public/art/char refs/gen/twirl.jpg && mv public/art/char/twirl.png public/art/char/twirl.png
```
Then edit `src/character.json`: each set lists `file`, `w`, `h` (cut-out size), `ex`, `ey` (from eye_anchor) and `faces`
(mood → file suffix; moods: neutral, front, glance, half, closed, pain, relief, shy, dream, moved). A missing mood falls back
to neutral. A second set (e.g. `black`) is used by heavy moods via `"set"` in a shot.

Check: contact-sheet everything (`tools/sheet.py`). Registered frames should report shift ≈ 0; if an edit changed the pose or
crop, regenerate it. Tell the user the models used and the credits spent.
