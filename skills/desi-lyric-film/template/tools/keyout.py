"""Remove the flat cream background from a generated element: flood from the border,
so enclosed cream (eye whites, highlights) stays opaque. Writes trimmed RGBA PNGs.
    keyout.py out_dir img.png [...]        one element per image
    keyout.py --split out_dir sheet.png    one PNG per connected element (sticker sheet)"""
import sys, os
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage as nd
split = sys.argv[1] == '--split'; args = sys.argv[2:] if split else sys.argv[1:]
out = args[0]; os.makedirs(out, exist_ok=True)
for f in args[1:]:
    im = Image.open(f).convert('RGB'); a = np.asarray(im).astype(np.float32)
    h, w, _ = a.shape
    border = np.concatenate([a[0], a[-1], a[:, 0], a[:, -1]])
    bg = np.median(border, 0)
    d = np.sqrt(((a - bg) ** 2).sum(2))
    near = d < 34
    lab, n = nd.label(near)
    edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    bgmask = np.isin(lab, list(edge))
    fg = ~bgmask
    fg = nd.binary_opening(fg, iterations=2)
    fg = nd.binary_fill_holes(fg) if False else fg
    # soft edge: alpha ramps with distance from bg color near the boundary
    soft = np.clip((d - 14) / 30, 0, 1)
    edgeband = nd.binary_dilation(fg, iterations=3) & ~nd.binary_erosion(fg, iterations=3)
    alpha = np.where(edgeband, soft, fg.astype(np.float32))
    alpha = np.asarray(Image.fromarray((alpha * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.8))) / 255
    rgba = np.dstack([a, alpha * 255]).astype(np.uint8)
    name = os.path.splitext(os.path.basename(f))[0]
    if not split:
        ys, xs = np.where(alpha > 0.05); pad = 8
        box = (max(0, xs.min() - pad), max(0, ys.min() - pad), min(w, xs.max() + pad), min(h, ys.max() + pad))
        Image.fromarray(rgba).crop(box).save(f'{out}/{name}.png'); print(name, box)
    else:
        lab2, n2 = nd.label(nd.binary_dilation(fg, iterations=12))
        sizes = nd.sum(np.ones_like(lab2), lab2, range(1, n2 + 1))
        k = 0
        for i, s in enumerate(sizes, 1):
            if s < 4000: continue
            ys, xs = np.where(lab2 == i); pad = 6
            box = (max(0, xs.min() - pad), max(0, ys.min() - pad), min(w, xs.max() + pad), min(h, ys.max() + pad))
            m = rgba.copy(); m[..., 3] = np.where(lab2 == i, m[..., 3], 0)
            Image.fromarray(m).crop(box).save(f'{out}/{name}_{k}.png'); print(name, k, box, (xs.mean()//1, ys.mean()//1)); k += 1
