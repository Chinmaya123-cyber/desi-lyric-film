"""Syllable-onset timings for fast singing, no transcription.
Centre channel (mid minus side) → vocal band 250–4000 Hz → harmonic part (median HPSS)
→ positive spectral flux → peak picking. Prints an activity strip and onset times.
    vocal_onsets.py song.mp3 --from A --to B --json out.json"""
import argparse, json, os, subprocess, tempfile
import numpy as np
from scipy.io import wavfile
from scipy.signal import stft, find_peaks
from scipy.ndimage import median_filter
ap = argparse.ArgumentParser(); ap.add_argument('song'); ap.add_argument('--from', dest='a', type=float, required=True)
ap.add_argument('--to', dest='b', type=float, required=True); ap.add_argument('--json'); ap.add_argument('--delta', type=float, default=0.5)
args = ap.parse_args()
tmp = os.path.join(tempfile.mkdtemp(), 'a.wav'); sr = 22050
subprocess.run(['ffmpeg','-v','error','-y','-ss',str(args.a),'-t',str(args.b-args.a),'-i',args.song,'-ar',str(sr),tmp], check=True)
_, x = wavfile.read(tmp); x = x.astype(np.float32) / 32768
L, R = x[:, 0], x[:, 1]
hop = 220  # 10 ms
f, t, M = stft((L + R) / 2, sr, nperseg=2048, noverlap=2048 - hop)
_, _, S = stft((L - R) / 2, sr, nperseg=2048, noverlap=2048 - hop)
mag = np.maximum(0, np.abs(M) - 0.8 * np.abs(S))
band = (f > 250) & (f < 4000)
mag = mag[band]
harm = median_filter(mag, size=(1, 17)); perc = median_filter(mag, size=(17, 1))
H = mag * (harm ** 2 / (harm ** 2 + perc ** 2 + 1e-9))
lg = np.log1p(H * 200)
flux = np.maximum(0, np.diff(lg, axis=1)).sum(0)
flux = np.convolve(flux, np.hanning(5) / np.hanning(5).sum(), 'same')
flux = (flux - np.median(flux)) / (np.percentile(flux, 95) - np.median(flux) + 1e-9)
energy = lg.sum(0); energy = (energy - np.percentile(energy, 10)) / (np.percentile(energy, 95) - np.percentile(energy, 10) + 1e-9)
pk, _ = find_peaks(flux, height=args.delta, distance=11)
times = [round(args.a + p * 0.01, 2) for p in pk if energy[min(p + 5, len(energy) - 1)] > 0.25]
print('vocal energy per 0.5s:')
for s in np.arange(0, args.b - args.a, 0.5):
    i = int(s * 100); e = energy[i:i + 50].mean()
    n = sum(1 for tt in times if args.a + s <= tt < args.a + s + 0.5)
    print(f'{args.a + s:7.1f} {"#" * int(max(0, e) * 30):<32} {"o" * n}')
print(len(times), 'onsets')
if args.json: json.dump(times, open(args.json, 'w'))
