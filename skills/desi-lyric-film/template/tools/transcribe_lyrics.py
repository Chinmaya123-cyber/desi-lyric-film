"""Word-timed lyrics from the user's own audio (faster-whisper). Writes refs/transcript.json:
[{s, e, words: [{w, s, e}]}] in SONG seconds. Prints only counts and timings — the text stays in the file.
    transcribe_lyrics.py refs/song.mp3 --from 191 --to 228 [--model large-v3] [--lang hi] [--prompt "…"]
--lang hi gives Devanagari, --lang en gives romanised Hindi for Hinglish songs; build_lyrics.py makes the other script.
With --onsets refs/onsets.json it also reports sung stretches the model could not read (fast passages): those become
wordless timing slots that build_lyrics.py fills from a pasted table/text, or the shot runs visual-only."""
import argparse, json, os, subprocess, tempfile
import numpy as np
from scipy.io import wavfile
ap = argparse.ArgumentParser()
ap.add_argument('song'); ap.add_argument('--from', dest='a', type=float, default=0); ap.add_argument('--to', dest='b', type=float, default=None)
ap.add_argument('--model', default='large-v3'); ap.add_argument('--lang', default='hi'); ap.add_argument('--prompt', default=None)
ap.add_argument('--onsets', default=None); ap.add_argument('--out', default='refs/transcript.json')
args = ap.parse_args()
from faster_whisper import WhisperModel
tmp = os.path.join(tempfile.mkdtemp(), 'a.wav')
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', args.song, '-ac', '1', '-ar', '16000', tmp], check=True)
sr, a = wavfile.read(tmp); a = a.astype(np.float32) / 32768
a = a[int(args.a * sr): int(args.b * sr) if args.b else None]
try: m = WhisperModel(args.model, device='cpu', compute_type='int8')
except Exception as e:
    print(f'{args.model} unavailable ({e}); falling back to medium'); m = WhisperModel('medium', device='cpu', compute_type='int8')
segs, info = m.transcribe(a, word_timestamps=True, language=None if args.lang == 'auto' else args.lang, initial_prompt=args.prompt,
                          vad_filter=False, condition_on_previous_text=False, temperature=0.0)
out = []
for sg in segs:
    ws = [{'w': w.word.strip(), 's': round(w.start + args.a, 2), 'e': round(w.end + args.a, 2)} for w in (sg.words or []) if w.word.strip()]
    if ws: out.append({'s': ws[0]['s'], 'e': ws[-1]['e'], 'words': ws})
os.makedirs(os.path.dirname(args.out) or '.', exist_ok=True)
json.dump(out, open(args.out, 'w'), ensure_ascii=False, indent=1)
nw = sum(len(s['words']) for s in out)
print(f'{len(out)} phrases, {nw} words → {args.out}')
for s in out: print(f'  phrase {s["s"]:7.2f}–{s["e"]:7.2f}  {len(s["words"])} words')
if args.onsets:
    on = [t for t in json.load(open(args.onsets)) if args.a <= t <= (args.b or 1e9)]
    covered = lambda t: any(s['s'] - 0.3 <= t <= s['e'] + 0.3 for s in out)
    miss = [t for t in on if not covered(t)]
    if miss:
        runs, cur = [], [miss[0]]
        for t in miss[1:]: (cur.append(t) if t - cur[-1] < 0.6 else (runs.append(cur), cur := [t]))
        runs.append(cur)
        print(f'unread sung stretches ({len(miss)} syllables): ' + ', '.join(f'{r[0]:.2f}–{r[-1]:.2f}' for r in runs if len(r) >= 3))
