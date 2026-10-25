"""Find the character's eyes by diffing an open-eye frame against a closed-eye one, and store the anchors.
    eye_anchor.py --set main public/art/char/main.png public/art/char/main_closed.png
    eye_anchor.py --closeup                       (uses public/art/char/cu_open.jpg vs cu_closed.jpg)"""
import json, sys
import numpy as np
from PIL import Image
from scipy import ndimage as nd
def eyes(a_path, b_path):
    a = np.asarray(Image.open(a_path).convert('RGB')).astype(float); b = np.asarray(Image.open(b_path).convert('RGB')).astype(float)
    m = nd.binary_opening(np.abs(a - b).sum(2) > 110, iterations=3)
    lab, n = nd.label(m); s = nd.sum(m, lab, range(1, n + 1)); big = np.argsort(s)[::-1][:2] + 1
    pts = sorted(nd.center_of_mass(m, lab, k)[::-1] for k in big)
    return [(round(x), round(y)) for x, y in pts], a.shape
ch = json.load(open('src/character.json'))
if sys.argv[1] == '--closeup':
    (l, r), _ = eyes('public/art/char/cu_open.jpg', 'public/art/char/cu_closed.jpg')
    ch['closeup'] = {**(ch.get('closeup') or {}), 'l': list(l), 'r': list(r)}; print('close-up eyes', l, r)
else:
    name, a, b = sys.argv[2:5]
    (p, q), sh = eyes(a, b)
    s = ch['sets'][name]; s['ex'] = round((p[0] + q[0]) / 2 / sh[1], 4); s['ey'] = round((p[1] + q[1]) / 2 / sh[0], 4)
    print(f'set {name}: eye midpoint ({s["ex"]}, {s["ey"]}) of the cut-out')
json.dump(ch, open('src/character.json', 'w'), indent=1)
