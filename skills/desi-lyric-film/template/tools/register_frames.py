"""Align edited stop-motion frames to their base drawing and cut them out on one shared canvas,
so swapping frames (open → half → closed eye) never jumps.
    register_frames.py out_dir name base.png frame1.jpg:suffix1 frame2.jpg:suffix2 ..."""
import sys, os
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage as nd
out, name, base, *frames = sys.argv[1:]
def alpha_of(a):
    border = np.concatenate([a[0], a[-1], a[:, 0], a[:, -1]]); bg = np.median(border, 0)
    d = np.sqrt(((a - bg) ** 2).sum(2)); near = d < 34
    lab, _ = nd.label(near)
    edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    fg = nd.binary_opening(~np.isin(lab, list(edge)), iterations=2)
    soft = np.clip((d - 14) / 30, 0, 1)
    band = nd.binary_dilation(fg, iterations=3) & ~nd.binary_erosion(fg, iterations=3)
    al = np.where(band, soft, fg.astype(np.float32))
    return np.asarray(Image.fromarray((al * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.8))) / 255
B = Image.open(base).convert('RGB')
imgs = [(B, '')]
for fs in frames:
    f, suf = fs.split(':'); F = Image.open(f).convert('RGB')
    # scale to base width, then search the best shift
    F = F.resize((B.width, round(F.height * B.width / F.width)), Image.LANCZOS)
    g = lambda im: np.asarray(im.convert('L').resize((im.width // 8, im.height // 8))).astype(float)
    gb, gf = g(B), g(F)
    best = (1e18, 0, 0)
    for dy in range(-6, 7):
        for dx in range(-6, 7):
            h = min(gb.shape[0], gf.shape[0]) - 14; w = gb.shape[1] - 14
            e = np.abs(gb[7:7 + h, 7:7 + w] - gf[7 + dy:7 + dy + h, 7 + dx:7 + dx + w]).mean()
            if e < best[0]: best = (e, dy, dx)
    _, dy, dx = best
    canvas = Image.new('RGB', B.size, tuple(int(c) for c in np.median(np.asarray(B)[0], 0)))
    canvas.paste(F, (-dx * 8, -dy * 8))
    print(suf, 'shift', dx * 8, dy * 8, 'err', round(best[0], 2))
    imgs.append((canvas, suf))
alphas = [alpha_of(np.asarray(im).astype(np.float32)) for im, _ in imgs]
union = np.max(alphas, 0); ys, xs = np.where(union > 0.05); pad = 8
box = (max(0, xs.min() - pad), max(0, ys.min() - pad), min(B.width, xs.max() + pad), min(B.height, ys.max() + pad))
os.makedirs(out, exist_ok=True)
for (im, suf), al in zip(imgs, alphas):
    rgba = Image.fromarray(np.dstack([np.asarray(im), al * 255]).astype(np.uint8)).crop(box)
    rgba.thumbnail((1400, 1400), Image.LANCZOS); rgba.save(f'{out}/{name}{suf}.png', optimize=True)
    print(f'{out}/{name}{suf}.png', rgba.size)
