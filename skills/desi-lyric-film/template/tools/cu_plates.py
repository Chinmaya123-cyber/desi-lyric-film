"""Eye close-up plates: a horizontal band of the character's face (brows → under the eyes) plus edits of it
(half, closed, tears, glance, smoulder …). Aligns every frame to the open one and crops each to 1920x1080.
    cu_plates.py open.jpg [half=half.jpg closed=closed.jpg tears=… glance=… smoulder=…]
Then run eye_anchor.py --closeup to store the eye positions."""
import json, sys
import numpy as np
from PIL import Image
base = Image.open(sys.argv[1]).convert('RGB'); W0, H0 = base.size
def plate(im):
    s = max(1080 / im.height, 1920 / im.width); im = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
    x, y = (im.width - 1920) // 2, (im.height - 1080) // 2
    return im.crop((x, y, x + 1920, y + 1080))
g = lambda im: np.asarray(im.convert('L').resize((W0 // 8, H0 // 8))).astype(float)
gb = g(base); plate(base).save('public/art/char/cu_open.jpg', quality=92); frames = ['open']
for kv in sys.argv[2:]:
    name, path = kv.split('=')
    F = Image.open(path).convert('RGB').resize((W0, H0), Image.LANCZOS); gf = g(F); best = (1e18, 0, 0)
    for dy in range(-6, 7):
        for dx in range(-6, 7):
            h, w = gb.shape[0] - 14, gb.shape[1] - 14
            e = np.abs(gb[7:7 + h, 7:7 + w] - gf[7 + dy:7 + dy + h, 7 + dx:7 + dx + w]).mean()
            if e < best[0]: best = (e, dy, dx)
    _, dy, dx = best
    c = base.copy(); c.paste(F, (-dx * 8, -dy * 8)); plate(c).save(f'public/art/char/cu_{name}.jpg', quality=92); frames.append(name)
    print(f'cu_{name}: shift {dx * 8},{dy * 8}')
ch = json.load(open('src/character.json'))
ch['closeup'] = {**(ch.get('closeup') or {'l': [627, 635], 'r': [1370, 626]}), 'frames': frames}
json.dump(ch, open('src/character.json', 'w'), indent=1)
