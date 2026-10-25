"""Look cards: full portraits of the character with their own background, each with a closed-eye frame.
Aligns the closed frame to the open one, samples the background colour, writes public/art/cards/<name>.jpg +
<name>_closed.jpg and adds the card to src/character.json.
    make_cards.py name open.jpg closed.jpg [name open.jpg closed.jpg ...]"""
import json, sys
import numpy as np
from PIL import Image
args = sys.argv[1:]
assert len(args) % 3 == 0, 'give triples: name open closed'
ch = json.load(open('src/character.json'))
cards = {c['name']: c for c in ch.get('cards', [])}
for i in range(0, len(args), 3):
    name, op, cl = args[i:i + 3]
    base = Image.open(op).convert('RGB'); H = 1300
    base = base.resize((round(base.width * H / base.height), H), Image.LANCZOS)
    F = Image.open(cl).convert('RGB').resize(base.size, Image.LANCZOS)
    g = lambda im: np.asarray(im.convert('L').resize((im.width // 6, im.height // 6))).astype(float)
    gb, gf = g(base), g(F); best = (1e18, 0, 0)
    for dy in range(-6, 7):
        for dx in range(-6, 7):
            h, w = gb.shape[0] - 14, gb.shape[1] - 14
            e = np.abs(gb[7:7 + h, 7:7 + w] - gf[7 + dy:7 + dy + h, 7 + dx:7 + dx + w]).mean()
            if e < best[0]: best = (e, dy, dx)
    _, dy, dx = best
    bgc = tuple(int(v) for v in np.median(np.asarray(base)[:40, :40].reshape(-1, 3), 0))
    c = Image.new('RGB', base.size, bgc); c.paste(F, (-dx * 6, -dy * 6))
    base.save(f'public/art/cards/{name}.jpg', quality=92); c.save(f'public/art/cards/{name}_closed.jpg', quality=92)
    cards[name] = {'name': name, 'bg': '#%02X%02X%02X' % bgc, 'w': base.width, 'h': base.height}
    print(f'card {name}: bg {cards[name]["bg"]}, closed frame shift {dx * 6},{dy * 6}')
ch['cards'] = list(cards.values())
json.dump(ch, open('src/character.json', 'w'), indent=1)
