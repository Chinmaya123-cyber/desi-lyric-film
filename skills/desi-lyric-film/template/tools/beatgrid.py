"""Find a song's tempo, beat grid, quiet breakdowns and drops.

    .venv/bin/python -I tools/beatgrid.py refs/song.mp3 [--from 40 --to 90]

Prints a per-second loudness bar chart (find the chorus / breakdown / drop by eye),
the BPM (searched 70-180, checked against half and double time), the beat phase,
and the downbeat candidates inside the window. Everything a scene timeline needs.
"""
import argparse, subprocess, tempfile, os
import numpy as np
from scipy.io import wavfile
from scipy.signal import stft

ap = argparse.ArgumentParser()
ap.add_argument('song'); ap.add_argument('--from', dest='a', type=float, default=None); ap.add_argument('--to', dest='b', type=float, default=None)
ap.add_argument('--bpm-min', type=float, default=70); ap.add_argument('--bpm-max', type=float, default=180)
args = ap.parse_args()

tmp = os.path.join(tempfile.mkdtemp(), 'a.wav')
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', args.song, '-ac', '1', '-ar', '16000', tmp], check=True)
sr, a = wavfile.read(tmp); a = a.astype(np.float32) / 32768
dur = len(a) / sr
A = args.a if args.a is not None else 0.0
Bt = args.b if args.b is not None else dur
hop = int(sr * 0.01); fs = 100

rms = np.array([np.sqrt(np.mean(a[i * hop:(i + 1) * hop] ** 2)) for i in range(len(a) // hop)])
print(f'duration {dur:.2f}s\n--- loudness per second (dBFS) ---')
for t in range(int(A), int(min(Bt, dur))):
    db = 20 * np.log10(rms[t * fs:(t + 1) * fs].mean() + 1e-9)
    print(f'{t:4d}s {db:6.1f} ' + '#' * int(max(0, db + 40)))

f_, tt, Z = stft(a, sr, nperseg=1024, noverlap=1024 - hop)
S = np.log1p(np.abs(Z) * 100)
flux = np.maximum(0, np.diff(S, axis=1)).sum(0); flux = (flux - flux.mean()) / flux.std()
seg = flux[int(A * fs):int(Bt * fs)]
ac = np.correlate(seg, seg, 'full')[len(seg) - 1:]
at = lambda lag: np.interp(lag, np.arange(len(ac)), ac)
score = lambda bpm: sum(at(k * 60 / bpm * fs) for k in (1, 2, 4))
bpms = np.arange(args.bpm_min, args.bpm_max, 0.02)
bpm = max(bpms, key=score)
for alt in (bpm * 2, bpm / 2):  # report octave alternatives
    if args.bpm_min <= alt <= args.bpm_max:
        print(f'(octave alternative {alt:.2f} BPM, score {score(alt):.0f} vs {score(bpm):.0f})')
per = 60 / bpm
ph = max(np.arange(0, per, 0.005), key=lambda p: flux[((np.arange(A + p, Bt - 0.1, per)) * fs).astype(int)].sum())
first = A + ph
print(f'--- tempo {bpm:.2f} BPM · beat {per:.4f}s · bar {per*4:.3f}s')
print(f'beats at {first:.3f} + k*{per:.4f}')
# downbeat guess: the beat phase (0-3) whose beats carry the most onset energy
best = max(range(4), key=lambda k: flux[((np.arange(first + k * per, Bt - 0.1, per * 4)) * fs).astype(int)].sum())
d0 = first + best * per
print(f'downbeat guess: {d0:.3f} + k*{per*4:.3f}  ->', ', '.join(f'{d0 + k*per*4:.2f}' for k in range(0, 12) if d0 + k*per*4 < Bt))
# drops: big loudness jumps
db = 20 * np.log10(np.convolve(rms, np.ones(50) / 50, 'same') + 1e-9)
jumps = [(i / fs, db[i + 50] - db[i - 50]) for i in range(int(A * fs) + 50, int(min(Bt, dur) * fs) - 50, 10)]
top = sorted([j for j in jumps if j[1] > 6], key=lambda j: -j[1])[:6]
print('--- loudness jumps (drop candidates):', ', '.join(f'{t:.1f}s (+{d:.0f}dB)' for t, d in sorted(top)) or 'none')
