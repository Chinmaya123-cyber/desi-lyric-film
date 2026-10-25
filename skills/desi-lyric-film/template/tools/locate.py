"""Find where a clip's audio sits inside the full song (FFT cross-correlation of onset envelopes)."""
import sys, subprocess, tempfile, os
import numpy as np
from scipy.io import wavfile
from scipy.signal import stft, fftconvolve
def load(p):
    t = os.path.join(tempfile.mkdtemp(), 'a.wav')
    subprocess.run(['ffmpeg','-v','error','-y','-i',p,'-ac','1','-ar','11025',t], check=True)
    sr, a = wavfile.read(t); return a.astype(np.float32) / 32768
def feat(a):
    f, tt, Z = stft(a, 11025, nperseg=1024, noverlap=1024-110)  # 10ms hop
    S = np.log1p(np.abs(Z) * 50)
    on = np.maximum(0, np.diff(S, axis=1)).sum(0)
    on = (on - on.mean()) / (on.std() + 1e-9)
    return on, S
song, clip = load(sys.argv[1]), load(sys.argv[2])
fs, Ss = feat(song); fc, Sc = feat(clip)
c = fftconvolve(fs, fc[::-1], mode='valid') / len(fc)
best = np.argsort(c)[::-1][:5]
print('clip length', len(clip) / 11025)
for b in best: print(f'offset {b*0.01:.2f}s score {c[b]:.3f}')
# chroma-ish check: spectral correlation at the best offset
b = best[0]; n = Sc.shape[1]
A = Ss[:, b:b+n]; Bm = Sc[:, :A.shape[1]]
print('spectral corr at best', np.corrcoef(A.ravel(), Bm.ravel())[0,1])
