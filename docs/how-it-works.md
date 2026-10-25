# How it works

```
your song ──► beat grid · hook detection · vocal syllable onsets ──► the part to use
          └─► automatic transcription (word times) ──► lyrics.json   (Devanagari + Roman, one entry per sung phrase)

your images / an idea ──► Atlabs MCP (Nano Banana 2.1 · GPT Image 2.5 Sunburst · Seedream 5)
                       ──► base drawing → expressions · blinks · eye close-ups · outfit/colour look cards · twirl
                       ──► character.json  (all frames registered on one canvas, eye positions found automatically)

lyrics + character ──► shot planner (refrain → eyes, emotion → her face, fast lines → outfit flips, …) ──► film.json
                   ──► Remotion engine: one persistent ornate stage, 7 shot kinds, 10 lettering styles, 7 transitions,
                       drawings on twos, line boil, paper cut-outs ──► 1920×1080 MP4
```

The full visual spec (palette with hex codes, fonts, sizes, outlines, motion timings) is in
[`skills/desi-lyric-film/references/style-guide.md`](../skills/desi-lyric-film/references/style-guide.md).
