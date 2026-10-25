"""Safety net for long parallel renders: find frames that came out blank (a rare Chrome hiccup — the boiled layer
can drop for a single frame), re-render each one on its own and overlay it back at the exact frame number.
    fix_blank_frames.py out/<name>-raw.mp4        (rewrites the file in place if anything was fixed)"""
import subprocess, sys, os, shutil
import numpy as np
src = sys.argv[1]
w, h = 96, 54
raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', src, '-vf', f'scale={w}:{h},format=gray', '-f', 'rawvideo', '-'], capture_output=True, check=True).stdout
frames = np.frombuffer(raw, np.uint8).reshape(-1, h, w).astype(float)
blank = [i for i, f in enumerate(frames) if f.std() < 8 and 0 < i < len(frames) - 30]  # the last second may legitimately fade
if not blank:
    print(f'no blank frames in {len(frames)}'); sys.exit(0)
print('re-rendering blank frames:', blank)
os.makedirs('out/fix', exist_ok=True)
subprocess.run(['node', 'tools/stills.mjs', 'out/fix', '1', *map(str, blank)], check=True)
inputs, chain, last = ['-i', src], '', '0:v'
for k, n in enumerate(blank):
    inputs += ['-i', f'out/fix/f{n:04d}.jpg']
    chain += f'[{last}][{k + 1}:v]overlay=enable=\'eq(n\\,{n})\'[v{k}];'; last = f'v{k}'
tmp = src.replace('.mp4', '.fixed.mp4')
subprocess.run(['ffmpeg', '-v', 'error', '-y', *inputs, '-filter_complex', chain.rstrip(';'), '-map', f'[{last}]', '-map', '0:a?',
                '-c:v', 'libx264', '-crf', '16', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-c:a', 'copy', tmp], check=True)
shutil.move(tmp, src); print(f'fixed {len(blank)} frame(s) in {src}')
