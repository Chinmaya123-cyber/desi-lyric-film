"""Draft src/film.json from the timed lyrics and the character: one shot per sung phrase.
    plan_shots.py --bpm 93.02 --beat0 0.0 --duration 36.1 [--audio audio/song_cut.wav] [--refrain "<the repeated line, in Roman>"]
Rules (then review every shot by meaning — this is a draft):
  repeated line (refrain)  → an eye moment: her close-ups (gaze varies) alternating with eye props
  pain words               → character pain → relief on the healing word
  touch / prayer / feeling → character moved        world / dream / forget → character dream
  stars / moon / shy       → shy stars             flower / dew → lotus with dew    heart / beat → look-card flips
  distance → hearts meet   path / light → lit path    a one-word cry → giant word over a mandala
  sargam syllables         → notes (twirl + look cards)    first phrase → doors open    last phrase → finale
Keywords are matched on the Roman line (lowercase, partial word)."""
import argparse, json, re
ap = argparse.ArgumentParser()
ap.add_argument('--bpm', type=float, required=True); ap.add_argument('--beat0', type=float, default=0.0); ap.add_argument('--duration', type=float, required=True)
ap.add_argument('--audio', default=None); ap.add_argument('--refrain', default=None); ap.add_argument('--title', default='Lyric film')
ap.add_argument('--lyrics', default='src/lyrics.json'); ap.add_argument('--character', default='src/character.json'); ap.add_argument('--out', default='src/film.json')
args = ap.parse_args()
L = json.load(open(args.lyrics)); CH = json.load(open(args.character))
cards = [c['name'] for c in CH.get('cards', [])]; has_cu = bool(CH.get('closeup')); sets = list(CH['sets'])
main = sets[0]; alt = sets[1] if len(sets) > 1 else sets[0]  # a second look (e.g. darker outfit) for heavy moods
norm = lambda l: re.sub(r'[^a-z ]', '', ' '.join(l['rom'] or l['dev']).lower()).strip()
lines = [norm(l) for l in L]
KW = {
  'pain': ['dard', 'zakhm', 'zakham', 'dukh', 'gham', 'ghum', 'toot', 'tuta', 'tooti', 'aansu', 'aanso', 'ashk', 'rona', 'roye', 'judaa', 'judai', 'hurt', 'pain', 'tear', 'cry', 'broken', 'wound'],
  'heal': ['marham', 'dawa', 'sukoon', 'rahat', 'heal', 'cure', 'balm'],
  'moved': ['chhoo', r'chhu\b', 'chhua', 'chhuo', 'chhue', 'ehsaas', 'mehsoos', 'dua', 'duaa', 'rab', 'ibadat', 'sajda', 'touch', 'feel', 'pray', 'bless'],
  'dream': ['jag', 'duniya', 'jahaan', 'jahan', 'bhool', 'khwab', 'khwaab', 'sapn', 'world', 'dream', 'forget'],
  'stars': ['taare', 'taara', 'sitar', 'chaand', 'chand', 'star', 'moon', 'aasmaan', 'sky'],
  'shy': ['sharm', 'haya', 'laaj', 'shy', 'blush'],
  'flower': ['phool', 'gul', 'kali', 'shabnam', 'gulaab', 'flower', 'petal', 'bloom', 'dew', 'rose'],
  'heart': ['dil', 'dhadk', 'heart', 'beat'],
  'distance': ['doori', 'faasl', 'faasle', 'distance', 'apart', 'mitaa'],
  'path': ['raah', 'raasta', 'rasta', 'safar', 'roshni', 'diya', 'path', 'road', 'light', 'way'],
  'cry': ['wallah', 'haaye', 'haye', 'uff', 'ohh', 'aah', 'oh'],
  'eyes': ['nain', 'aankh', 'nazar', 'nigaah', 'nigah', 'palk', 'palak', 'eyes', 'gaze'],
}
SARGAM = {'sa', 're', 'ga', 'ma', 'pa', 'dha', 'ni', 'saa', 'raa', 'gaa', 'maa', 'paa', 'dhaa', 'nee', 'nii'}
has = lambda line, k: any(re.search(r'\b' + w, line) for w in KW[k])
counts = {}
for l in lines: counts[l] = counts.get(l, 0) + 1
refrain_txt = args.refrain.lower() if args.refrain else None
def is_refrain(l): return (refrain_txt and refrain_txt in l) or (counts.get(l, 0) >= 2 and len(l.split()) <= 4)

shots, bg_prev = [], None
EYE_PROPS = ['sunEye', 'peacockEye', 'lotusEye', 'galaxyEye', 'starEye']
CU_GAZES = ['open', 'glance', 'smoulder', 'open', 'glance']
cu_gazes = [g for g in CU_GAZES if g in (CH.get('closeup') or {}).get('frames', ['open'])] or ['open']
eye_i = prop_tr = 0
def pick_bg(pref):
    global bg_prev
    order = pref + [b for b in ['orange', 'teal', 'pink', 'marigold', 'navy', 'yellow', 'green'] if b not in pref]
    b = next(x for x in order if x != bg_prev); bg_prev = b; return b
for i, (lyr, line) in enumerate(zip(L, lines)):
    t = 0.0 if i == 0 else round(lyr['t0'] - 0.02, 2)
    n = len(lyr['dev']); dur = max(0.3, lyr['times'][-1] - lyr['times'][0]); rate = n / dur if n > 1 else 0
    words = set(line.split())
    s = {'t': t, 'slot': i}
    if i == 0:
        s.update(kind='open', set=main, doors=[0.3, max(0.9, min(lyr['times'][0] - 0.3, 1.8))], bg=pick_bg(['pink']), transition='cut')
    elif i == len(L) - 1:
        s.update(kind='end', set=main, bg=pick_bg(['yellow', 'pink']), transition='iris', flips=[{'word': k, 'card': cards[(k - 1) % len(cards)]} for k in range(1, n, 2)] if cards else [])
    elif words and words <= SARGAM:
        s.update(kind='notes', transition='spin', bg=pick_bg(['marigold']), notes=[{'t': tt, 'dev': d, 'rom': r, **({'card': cards[(j - 1) % len(cards)]} if cards and j else {})} for j, (tt, d, r) in enumerate(zip(lyr['times'], lyr['dev'], lyr['rom'] or lyr['dev']))])
        s.pop('slot')
    elif is_refrain(line) or (has(line, 'eyes') and n <= 3):
        use_cu = has_cu and eye_i % 2 == 0
        if use_cu: s.update(kind='eyes', gaze=cu_gazes[(eye_i // 2) % len(cu_gazes)], transition='blink', refrain=True)
        else: s.update(kind='prop', prop=EYE_PROPS[(eye_i // 2) % len(EYE_PROPS)], transition='zoom', refrain=True, bg=pick_bg(['orange', 'navy', 'pink']))
        eye_i += 1
    elif has(line, 'pain'):
        heal = next((k for k, w in enumerate(lyr['rom'] or []) if any(w.lower().startswith(h) for h in KW['heal'])), None)
        s.update(kind='character', mood='pain', set=alt, bg=pick_bg(['navy']), transition='tear', **({'reliefWord': heal} if heal is not None else {}))
    elif has(line, 'moved'): s.update(kind='character', mood='moved', set=main, bg=pick_bg(['pink']), transition='iris')
    elif has(line, 'stars') or has(line, 'shy'):
        s.update(kind='prop', prop='shyStars', bg=pick_bg(['navy']), transition='iris') if has(line, 'stars') else s.update(kind='character', mood='shy', set=main, bg=pick_bg(['pink']), transition='iris')
    elif has(line, 'dream'): s.update(kind='character', mood='dream', set=alt, bg=pick_bg(['navy']), transition='slide')
    elif has(line, 'flower'): s.update(kind='prop', prop='lotusDew', bg=pick_bg(['teal']), transition='iris')
    elif has(line, 'heal'): s.update(kind='prop', prop='kintsugi', bg=pick_bg(['teal', 'navy']), transition='slide')
    elif has(line, 'heart'):
        s.update(kind='cards', transition='iris') if cards and rate >= 2.5 else s.update(kind='prop', prop='heartbeat', bg=pick_bg(['pink']), transition='iris')
    elif has(line, 'distance'): s.update(kind='prop', prop='heartsMeet', bg=pick_bg(['teal']), transition='tear')
    elif has(line, 'path'): s.update(kind='prop', prop='path', bg=pick_bg(['marigold']), transition='slide')
    elif n == 1 or has(line, 'cry'): s.update(kind='prop', prop='mandala', bg=pick_bg(['orange']), transition='iris')
    elif cards and rate >= 3.0: s.update(kind='cards', transition='iris')
    else: s.update(kind='character', mood='calm', set=main, face='glance' if i % 2 else 'neutral', bg=pick_bg(['pink', 'orange', 'teal']), transition=['iris', 'slide', 'tear'][i % 3])
    shots.append(s)
film = {'title': args.title, 'bpm': args.bpm, 'beatOffset': args.beat0, 'duration': args.duration, 'audio': args.audio,
        'stage': {'outer': '#00756C', 'buti': '#FF7FAB', 'field': '#F7B500'}, 'shots': shots}
json.dump(film, open(args.out, 'w'), ensure_ascii=False, indent=1)
kinds = {}
for s in shots: kinds[s['kind'] + (':' + s.get('prop', s.get('mood', '')) if s.get('prop') or s.get('mood') else '')] = kinds.get(s['kind'], 0) + 1
print(f'{len(shots)} shots → {args.out}')
for s in shots: print(f"  {s['t']:6.2f}s  {s['kind']:<9} {s.get('prop', s.get('mood', s.get('gaze', ''))):<11} bg={s.get('bg', 'card')}  {s.get('transition')}")
