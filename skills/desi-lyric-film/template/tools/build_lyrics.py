"""Build src/lyrics.json (one entry per sung phrase, video seconds) from any of:
    --transcript refs/transcript.json   (transcribe_lyrics.py output; words keep their own times)
    --table lyrics.txt                   (a timestamped lyrics table: rows like "03:11 – 03:16 <lyrics>[TAB]<translation>")
    --text lyrics.txt                    (plain lines, one sung phrase per line, in order)
and always:  --slice A B  (the song seconds the video uses; video t = song t − A)   --onsets refs/onsets.json
Word times are snapped to the nearest detected syllable onset (±0.15 s). Table/text lines are placed on the sung phrases
found in the onsets (split/merged to match the line count) and their words spread by syllable count. Each line gets both
scripts: Devanagari ↔ Roman is converted automatically (write "देवनागरी | roman" in a line to give both yourself).
Prints only counts — the lyric text stays in the files."""
import argparse, json, re
ap = argparse.ArgumentParser()
g = ap.add_mutually_exclusive_group(required=True)
g.add_argument('--transcript'); g.add_argument('--table'); g.add_argument('--text')
ap.add_argument('--slice', nargs=2, type=float, required=True); ap.add_argument('--onsets', required=True)
ap.add_argument('--out', default='src/lyrics.json'); ap.add_argument('--gap', type=float, default=0.42)
ap.add_argument('--drop-before', type=float, default=0.0, help='video seconds: ignore anything before the first real vocal')
args = ap.parse_args()
S0, S1 = args.slice
ON = [round(t - S0, 2) for t in json.load(open(args.onsets)) if S0 + 0.05 <= t <= S1]

# ── scripts ──────────────────────────────────────────────────────────────────────────
DEVA = re.compile('[ऀ-ॿ]')
CONS = {'क':'k','ख':'kh','ग':'g','घ':'gh','ङ':'n','च':'ch','छ':'chh','ज':'j','झ':'jh','ञ':'n','ट':'t','ठ':'th','ड':'d','ढ':'dh','ण':'n','त':'t','थ':'th','द':'d',
        'ध':'dh','न':'n','प':'p','फ':'ph','ब':'b','भ':'bh','म':'m','य':'y','र':'r','ल':'l','व':'v','श':'sh','ष':'sh','स':'s','ह':'h'}
NUKTA = {'क':'q','ख':'kh','ग':'gh','ज':'z','फ':'f','ड':'r','ढ':'rh'}
VOW = {'अ':'a','आ':'aa','इ':'i','ई':'ee','उ':'u','ऊ':'oo','ए':'e','ऐ':'ai','ओ':'o','औ':'au','ऋ':'ri'}
MAT = {'ा':'aa','ि':'i','ी':'ee','ु':'u','ू':'oo','ृ':'ri','े':'e','ै':'ai','ो':'o','ौ':'au','ॅ':'e','ॉ':'o'}
PRECOMP = {'क़':'क़','ख़':'ख़','ग़':'ग़','ज़':'ज़','ड़':'ड़','ढ़':'ढ़','फ़':'फ़'}
def rom_word(w):
    for k, v in PRECOMP.items(): w = w.replace(k, v)
    out, i, ch = [], 0, list(w)
    while i < len(ch):
        c = ch[i]; nxt = ch[i + 1] if i + 1 < len(ch) else ''
        if c in CONS:
            base = NUKTA.get(c, CONS[c]) if nxt == '़' else CONS[c]
            if nxt == '़': i += 1; nxt = ch[i + 1] if i + 1 < len(ch) else ''
            out.append(base)
            if nxt in MAT: out.append(MAT[nxt]); i += 1
            elif nxt == '्': i += 1
            else: out.append('a*')
        elif c in VOW: out.append(VOW[c])
        elif c in 'ंँ': out.append('n')
        elif c == 'ः': out.append('h')
        elif c not in '़।॥': out.append(c)
        i += 1
    s = ''.join(out)
    s = re.sub(r'a\*$', '', s); s = s.replace('a*', 'a')
    return re.sub(r'aa$', 'a', re.sub(r'ee$', 'i', re.sub(r'oo$', 'u', s)))
COMMON = {'tere':'तेरे','teri':'तेरी','tera':'तेरा','mere':'मेरे','meri':'मेरी','mera':'मेरा','ke':'के','ki':'की','ka':'का','ko':'को','se':'से','mein':'में',
          'main':'मैं','hai':'है','hain':'हैं','toh':'तो','to':'तो','bhi':'भी','pe':'पे','par':'पर','aa':'आ','re':'रे','ho':'हो','na':'ना','kyun':'क्यों',
          'koi':'कोई','yeh':'ये','ye':'ये','woh':'वो','wo':'वो','jo':'जो','dono':'दोनों','jahaan':'जहाँ','naina':'नैना','naino':'नैनों','nainon':'नैनों',
          'aankhen':'आँखें','aankhon':'आँखों','pyaar':'प्यार','ishq':'इश्क़','zindagi':'ज़िंदगी','dil':'दिल','dhadkan':'धड़कन','badal':'बादल','pahaad':'पहाड़','sadak':'सड़क','ladki':'लड़की','ladka':'लड़का','padh':'पढ़','badhna':'बढ़ना','mitti':'मिट्टी','chhoo':'छू','chhu':'छू',
          'dein':'दें',
          'lein':'लें','aaye':'आए','jaayein':'जाएँ','sa':'सा','re_':'रे','ga':'ग','ma':'मा','pa':'पा','dha':'धा','ni':'नी'}
RCONS = [('chh','छ'),('kh','ख'),('gh','घ'),('ch','च'),('jh','झ'),('th','थ'),('dh','ध'),('ph','फ'),('bh','भ'),('sh','श'),('k','क'),('g','ग'),('j','ज'),('t','त'),
         ('d','द'),('n','न'),('p','प'),('f','फ़'),('b','ब'),('m','म'),('y','य'),('r','र'),('l','ल'),('v','व'),('w','व'),('s','स'),('h','ह'),('z','ज़'),('q','क़'),('c','क'),('x','क्स')]
RVOW = [('aa','आ','ा'),('ai','ऐ','ै'),('au','औ','ौ'),('ee','ई','ी'),('oo','ऊ','ू'),('ei','ए','े'),('a','अ',''),('e','ए','े'),('i','इ','ि'),('o','ओ','ो'),('u','उ','ु')]
def dev_word(w):
    lw = re.sub(r'[^a-z]', '', w.lower())
    if not lw: return w
    if lw in COMMON: return COMMON[lw]
    out, i, prev = '', 0, False
    while i < len(lw):
        rest = lw[i:]
        for pat, c_, v_ in (('ein', 'ें', 'एँ'), ('ain', 'ैं', 'ऐं'), ('on', 'ों', 'ओं')):
            if rest == pat: return out + (c_ if prev else v_)
        v = next(((p, a, m) for p, a, m in RVOW if rest.startswith(p)), None)
        if v:
            p, ind, mat = v
            if p == 'a' and i == len(lw) - 1 and prev: mat = 'ा'
            if p == 'i' and i == len(lw) - 1: mat, ind = 'ी', 'ई'
            out += mat if prev else ind; i += len(p); prev = False; continue
        c = next(((p, d) for p, d in RCONS if rest.startswith(p)), None)
        if not c: i += 1; continue
        p, d = c; nxt = lw[i + len(p):i + len(p) + 1]
        if p == 'n' and not prev and i > 0 and nxt and nxt not in 'aeiouyh': out += 'ं'; i += 1; continue
        if p == 'h' and i == len(lw) - 1 and i > 0 and lw[i - 1] in 'oeu': i += 1; continue
        if prev:
            last = lw[i - 1]; end = i + len(p) == len(lw)
            if p in ('y', 'r', 'v', 'w') or lw[i:i + len(p)] == lw[i - len(p):i] or end or (last == 's' and p in ('t', 'th', 'k', 'p')) or (lw[max(0, i - 2):i] == 'sh' and p in ('t', 'k', 'q')):
                out += '्'
        out += d; i += len(p); prev = True
    return out
def both(text):
    dev_part, _, rom_part = text.partition('|')
    dev_part, rom_part = dev_part.strip(), rom_part.strip()
    if rom_part: return dev_part.split(), rom_part.split()
    ws = re.sub(r'[,.!?"“”]', ' ', dev_part).split()
    if any(DEVA.search(w) for w in ws): return ws, [rom_word(w) for w in ws]
    return [dev_word(w) for w in ws], ws
def syl(w):
    if DEVA.search(w):
        n = sum(1 for c in w if c in VOW or c in MAT)
        n += sum(1 for i, c in enumerate(w) if c in CONS and i + 1 < len(w) and w[i + 1] not in MAT and w[i + 1] not in '़्ंँ')
        return max(1, n)
    return max(1, len(re.findall(r'[aeiouy]+', w.lower())))
snap = lambda t: min(ON, key=lambda o: abs(o - t)) if ON and abs(min(ON, key=lambda o: abs(o - t)) - t) <= 0.15 else t

# ── phrases from onsets (for table/text) ─────────────────────────────────────────────
def onset_phrases():
    if not ON: return []
    ph = [[ON[0]]]
    for a, b in zip(ON, ON[1:]): ph.append([b]) if b - a > args.gap else ph[-1].append(b)
    out = []
    for p in ph:
        if len(p) == 1 and out and p[0] - out[-1][-1] < 1.4: out[-1] += p
        else: out.append(p)
    return out
def fit(ph, n):
    ph = [list(p) for p in ph]
    while len(ph) < n:
        k = max(range(len(ph)), key=lambda i: len(ph[i])); p = ph[k]
        if len(p) < 2: break
        j = max(range(max(1, len(p) // 4), max(2, len(p) - len(p) // 4)), key=lambda j: p[j] - p[j - 1])
        ph[k:k + 1] = [p[:j], p[j:]]
    while len(ph) > n:
        k = min(range(len(ph) - 1), key=lambda i: ph[i + 1][0] - ph[i][-1]); ph[k:k + 2] = [ph[k] + ph[k + 1]]
    return ph
def place(lines):
    out = []
    for text, p in zip(lines, fit(onset_phrases(), len(lines))):
        dev, rom = both(text)
        ref = dev or rom
        sy = [syl(w) for w in ref]; tot = sum(sy) or 1; cum = 0; times = []
        for s_ in sy: times.append(p[min(len(p) - 1, round(cum * len(p) / tot))]); cum += s_
        out.append({'dev': dev, 'rom': rom if len(rom) == len(dev) else [], 'times': times})
    return out
def phrases_of(lyric):  # a table row → its sung parts: main line, "( … )" echoes, "…"-separated parts; 7+ words halved
    parts = []
    for m in re.finditer(r'\(([^)]*)\)|([^()]+)', lyric):
        for seg in re.split(r'\.{2,}|…', m.group(1) if m.group(1) is not None else m.group(2)):
            seg = re.sub(r'[,.!?]', ' ', seg).strip()
            if seg and not re.search(r'instrumental|classical|sargam|alaap|interlude|outro|prelude|repeats|music', seg, re.I): parts.append(seg)
    out = []
    for p in parts:
        ws = p.split(); out += [' '.join(ws[:len(ws) // 2]), ' '.join(ws[len(ws) // 2:])] if len(ws) >= 7 else [p]
    return out

lines = []
if args.transcript:
    T = json.load(open(args.transcript))
    for sg in T:
        # keep only words that sit on a real sung syllable: Whisper invents words over instrumental passages
        ws = [w for w in sg['words'] if S0 <= w['s'] < S1 and ON and min(abs(o - (w['s'] - S0)) for o in ON) <= 0.35]
        if not ws: continue
        chunk = [ws[0]]
        for w in ws[1:]:  # split long sung phrases at their pauses
            if w['s'] - chunk[-1]['e'] > 0.35 or len(chunk) >= 7: lines.append(chunk); chunk = [w]
            else: chunk.append(w)
        lines.append(chunk)
    out = []
    for ch in lines:
        dev, rom = both(' '.join(w['w'] for w in ch))
        n = min(len(dev), len(ch))
        out.append({'dev': dev[:n], 'rom': rom[:n] if len(rom) >= n else [], 'times': [snap(w['s'] - S0) for w in ch[:n]]})
elif args.table:
    rows, cur = [], None
    for raw in open(args.table, encoding='utf-8'):
        line = raw.rstrip('\n')
        if not line.strip() or line.lstrip().startswith('#'): continue
        m = re.match(r'\s*(\d{1,2}):(\d{2})\s*[–—-]\s*(\d{1,2}):(\d{2})\s*(.*)', line)
        if m:
            cur = {'t0': int(m.group(1)) * 60 + int(m.group(2)), 'text': m.group(5).split('\t')[0].strip()}; rows.append(cur)
        elif cur is not None and not cur.get('closed'):
            first = line.split('\t')[0].strip()
            if first: cur['text'] += ' ' + first
            if '\t' in line: cur['closed'] = True
    rows = [r for r in rows if S0 - 0.5 <= r['t0'] < S1 - 1]
    out = place([p for r in rows for p in phrases_of(r['text'])])
else:
    out = place([l.strip() for l in open(args.text, encoding='utf-8') if l.strip() and not l.lstrip().startswith('#')])
out = [o for o in out if o['dev'] and o['times'][0] >= args.drop_before]
# short phrases far from any other sung phrase are often hallucinated over instrumental passages — flag them
sus = [i for i, o in enumerate(out) if len(o['dev']) <= 2 and all(abs(o['times'][0] - p['times'][-1]) > 2.0 and abs(p['times'][0] - o['times'][-1]) > 2.0 for j, p in enumerate(out) if j != i)]
if sus: print(f'check these isolated short phrases (possible hallucination over music): slots {sus} at ' + ', '.join(f"{out[i]['times'][0]:.2f}s" for i in sus) + ' — drop with --drop-before or delete them')
for i, o in enumerate(out):
    o['t0'] = o['times'][0]; o['t1'] = round(min(out[i + 1]['times'][0] if i + 1 < len(out) else 1e9, o['times'][-1] + 1.6), 2)
json.dump(out, open(args.out, 'w'), ensure_ascii=False, indent=1)
print(f'{len(out)} sung phrases → {args.out}; words per phrase: {[len(o["dev"]) for o in out]}')
