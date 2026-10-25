"""Chroma self-similarity: find repeated sections (chorus) in a song."""
import sys, subprocess, tempfile, os
import numpy as np
from scipy.io import wavfile
from scipy.signal import stft
tmp = os.path.join(tempfile.mkdtemp(), 'a.wav')
subprocess.run(['ffmpeg','-v','error','-y','-i',sys.argv[1],'-ac','1','-ar','22050',tmp],check=True)
sr,a = wavfile.read(tmp); a=a.astype(np.float32)/32768
f,t,Z = stft(a,sr,nperseg=4096,noverlap=4096-2205)  # 0.1s hop
M = np.abs(Z)
fr = f[1:]; midi = np.round(69+12*np.log2(fr/440)).astype(int)
C = np.zeros((12,M.shape[1]))
for i,m in enumerate(midi):
    if 40<=m<=90: C[m%12]+=M[i+1]
# 1s frames
n=C.shape[1]//10; C=C[:,:n*10].reshape(12,n,10).mean(2)
C/= (np.linalg.norm(C,axis=0)+1e-9)
S = C.T@C
# smooth along diagonals with 8s window to find repeating segments
L=8; n=S.shape[0]
D=np.zeros_like(S)
for i in range(n-L):
    for j in range(n-L):
        D[i,j]=np.mean([S[i+k,j+k] for k in range(L)])
for i in range(n): 
    for j in range(max(0,i-10),min(n,i+11)): D[i,j]=0
rep = np.sort(D,axis=1)[:,-3:].mean(1)
print('sec: repetition score (top-3 matches) and best match times')
for i in range(0,n-L,2):
    best=np.argsort(D[i])[-3:][::-1]
    print(f'{i:4d} {rep[i]:.3f} '+'#'*int(max(0,(rep[i]-0.6)*100))+'  ~'+','.join(str(b) for b in best))
