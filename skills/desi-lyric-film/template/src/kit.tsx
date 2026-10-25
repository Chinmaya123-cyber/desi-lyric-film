import React, {useId} from 'react';
import {AbsoluteFill, Img, interpolate, random, staticFile, useCurrentFrame, Easing} from 'remotion';
import {loadFont as loadModak} from '@remotion/google-fonts/Modak';
import {loadFont as loadKalam} from '@remotion/google-fonts/Kalam';
import {C, B, FPS, W, H} from './theme';

export const MODAK = loadModak('normal', {subsets: ['devanagari', 'latin']}).fontFamily;
export const KALAM = loadKalam('normal', {weights: ['700'], subsets: ['devanagari', 'latin']}).fontFamily;

// Natural pixel sizes of the cut-out props in public/art (character art is registered from src/character.json).
export const ART: Record<string, [number, number]> = {
  eye: [1400, 782], eye_half: [1400, 782], eye_closed: [1400, 782], eye_universe: [1400, 961], diya: [1245, 1400], hand: [1400, 1181],
  toran: [1400, 471], door: [665, 1400], lotus: [1400, 1223], feather: [482, 1400], mandala: [1400, 1382],
  globe: [1198, 1200], shy_stars: [1200, 559], heart_kintsugi: [1200, 1091],
  'eyes/eyes_1': [600, 447], 'eyes/eyes_2': [600, 378], 'eyes/eyes_3': [600, 382],
  'st/petal': [400, 337], 'st/rose': [398, 400], 'st/butterfly': [400, 294], 'st/jasmine': [400, 392],
  'st/heart': [400, 361], 'st/moon': [362, 400], 'st/paisley': [307, 400], 'st/star': [326, 400], 'st/marigold': [400, 358],
};
export const PLATES: string[] = []; // optional full-frame background plates (art/<name>.jpg)

// ── time ────────────────────────────────────────────────────────────────────────────────
// Everything moves "on twos" (12 drawings a second) like hand-drawn cel animation.
export const LEAD = 4; // scenes start 4 frames before their beat so the wipe lands on it
export const useT = () => {
  const f = useCurrentFrame() - LEAD;
  return f - (((f % 2) + 2) % 2);
};
export const beatOf = (t: number) => t / FPS / B; // local frames → beats (scenes start on whole beats)
export const ease = Easing.bezier(0.33, 0, 0.2, 1);
export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const prog = (t: number, a: number, b: number, e = ease) => e(clamp01((t - a) / (b - a)));
// overshoot pop, 0 → 1, over `dur` frames
export const pop = (t: number, start: number, dur = 8) => {
  if (t < start) return 0;
  const p = (t - start) / dur;
  return p >= 1 ? 1 : interpolate(p, [0, 0.45, 0.72, 1], [0, 1.18, 0.94, 1]);
};
// squash that goes with a pop: tall then wide then settle
export const squash = (t: number, start: number, dur = 8) => {
  if (t < start) return 1;
  const p = (t - start) / dur;
  return p >= 1 ? 1 : interpolate(p, [0, 0.3, 0.6, 1], [1.35, 0.85, 1.06, 1]);
};
// decaying kick on every beat (0..1)
export const kick = (t: number, len = 0.35) => {
  const ph = beatOf(t) % 1;
  return ph < len ? 1 - ph / len : 0;
};
// hand-drawn jitter: a new value every 4 frames
export const jit = (t: number, seed: string, amt: number) => (random(`${seed}-${Math.floor(t / 4)}`) - 0.5) * 2 * amt;

// ── art ─────────────────────────────────────────────────────────────────────────────────
type ArtProps = {
  name: string; x: number; y: number; w: number;
  rot?: number; sx?: number; sy?: number; opacity?: number; flip?: boolean;
  reveal?: number; // 0..1 brush-scribble reveal
  origin?: string; style?: React.CSSProperties;
};
// a zig-zag brush path that covers the whole image when fully drawn
const zig = (w: number, h: number, rows: number) => {
  const pts: [number, number][] = [];
  for (let i = 0; i <= rows; i++) pts.push([i % 2 ? w * 1.12 : -w * 0.12, (i / rows) * h * 1.1 - h * 0.05]);
  let len = 0;
  for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  return {d: 'M' + pts.map((p) => p.join(',')).join(' L'), len};
};
export const Art: React.FC<ArtProps> = ({name, x, y, w, rot = 0, sx = 1, sy = 1, opacity = 1, flip = false, reveal = 1, origin = '50% 50%', style}) => {
  const [nw, nh] = ART[name];
  const h = (w * nh) / nw;
  const id = 'm' + useId().replace(/[^a-zA-Z0-9]/g, '');
  const src = staticFile(`art/${name}.png`);
  if (reveal <= 0 || opacity <= 0) return null;
  const rows = 6;
  const z = zig(nw, nh, rows);
  return (
    <div style={{position: 'absolute', left: x - w / 2, top: y - h / 2, width: w, height: h, opacity,
      transform: `rotate(${rot}deg) scale(${sx * (flip ? -1 : 1)},${sy})`, transformOrigin: origin, ...style}}>
      {reveal >= 1 ? (
        <Img src={src} style={{width: '100%', height: '100%', display: 'block'}} />
      ) : (
        <svg width={w} height={h} viewBox={`0 0 ${nw} ${nh}`} style={{display: 'block', overflow: 'visible'}}>
          <defs>
            <mask id={id} maskUnits="userSpaceOnUse" x={-nw} y={-nh} width={nw * 3} height={nh * 3}>
              <path d={z.d} stroke="white" fill="none" strokeWidth={(nh / rows) * 2.1} strokeLinecap="round" strokeLinejoin="round"
                strokeDasharray={z.len} strokeDashoffset={z.len * (1 - reveal)} />
            </mask>
          </defs>
          <image href={src} width={nw} height={nh} mask={`url(#${id})`} />
        </svg>
      )}
    </div>
  );
};

export const Plate: React.FC<{name: string; scale?: number; style?: React.CSSProperties}> = ({name, scale = 1, style}) => (
  <AbsoluteFill style={{transform: `scale(${scale})`, ...style}}>
    <Img src={staticFile(`art/${name}.jpg`)} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
  </AbsoluteFill>
);

// ── shapes ──────────────────────────────────────────────────────────────────────────────
// scalloped flower (transitions, ripples)
export const flower = (cx: number, cy: number, R: number, k = 12, amp = 0.14, steps = 240) => {
  let d = '';
  for (let i = 0; i <= steps; i++) {
    const th = (i / steps) * Math.PI * 2;
    const r = R * (1 - amp + amp * Math.abs(Math.cos((k * th) / 2)));
    d += `${i ? 'L' : 'M'}${(cx + r * Math.cos(th)).toFixed(1)},${(cy + r * Math.sin(th)).toFixed(1)}`;
  }
  return d + 'Z';
};
// scalloped cartouche frame (superellipse with even lobes), like a block-printed border
export const cartouche = (cx: number, cy: number, a: number, b: number, lobes = 44, amp = 14, n = 5) => {
  const base: [number, number][] = [];
  const N = 1600;
  for (let i = 0; i < N; i++) {
    const th = (i / N) * Math.PI * 2;
    const c = Math.cos(th), s = Math.sin(th);
    base.push([a * Math.sign(c) * Math.abs(c) ** (2 / n), b * Math.sign(s) * Math.abs(s) ** (2 / n)]);
  }
  const cum = [0];
  for (let i = 1; i <= N; i++) {
    const p = base[i % N], q = base[i - 1];
    cum.push(cum[i - 1] + Math.hypot(p[0] - q[0], p[1] - q[1]));
  }
  const L = cum[N];
  let d = '';
  for (let i = 0; i < N; i++) {
    const [x, y] = base[i];
    const r = Math.hypot(x, y);
    const bump = amp * Math.abs(Math.sin((Math.PI * lobes * cum[i]) / L));
    d += `${i ? 'L' : 'M'}${(cx + x + (x / r) * bump).toFixed(1)},${(cy + y + (y / r) * bump).toFixed(1)}`;
  }
  return d + 'Z';
};
export const sparkle = (s: number) =>
  `M0,${-s} C${s * 0.12},${-s * 0.12} ${s * 0.12},${-s * 0.12} ${s},0 C${s * 0.12},${s * 0.12} ${s * 0.12},${s * 0.12} 0,${s} C${-s * 0.12},${s * 0.12} ${-s * 0.12},${s * 0.12} ${-s},0 C${-s * 0.12},${-s * 0.12} ${-s * 0.12},${-s * 0.12} 0,${-s}Z`;
export const heartPath = (cx: number, cy: number, s: number) => {
  let d = '';
  for (let i = 0; i <= 120; i++) {
    const t = (i / 120) * Math.PI * 2;
    const x = 16 * Math.sin(t) ** 3;
    const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
    d += `${i ? 'L' : 'M'}${(cx + (x * s) / 16).toFixed(1)},${(cy + (y * s) / 16).toFixed(1)}`;
  }
  return d;
};

// ── backgrounds ─────────────────────────────────────────────────────────────────────────
// Indie two-colour block print: flat colour A, buti motif in colour B, calm scalloped cartouche in the middle.
export const PairBG: React.FC<{a: string; b: string; t: number; accent?: string; frame?: boolean}> = ({a, b, t, accent = C.marigold, frame = true}) => {
  const id = 'p' + useId().replace(/[^a-zA-Z0-9]/g, '');
  const drift = (t * 0.6) % 140;
  const k = kick(t, 0.3);
  return (
    <AbsoluteFill style={{background: a}}>
      <svg width={W} height={H} style={{position: 'absolute'}}>
        <defs>
          <pattern id={id} width={140} height={140} patternUnits="userSpaceOnUse" patternTransform={`translate(${drift},${drift * 0.5})`}>
            <g fill={b} opacity={0.5}>
              {[0, 90, 180, 270].map((r) => <ellipse key={r} cx={70} cy={56} rx={7} ry={14} transform={`rotate(${r} 70 70)`} />)}
              <circle cx={70} cy={70} r={6} fill={accent} opacity={0.9} />
              {[[0, 0], [140, 0], [0, 140], [140, 140]].map(([x, y]) => <circle key={`${x}${y}`} cx={x} cy={y} r={4} />)}
              <path d="M35,110 q10,-14 0,-26 q-10,14 0,26z" opacity={0.7} />
              <path d="M105,30 q10,-14 0,-26 q-10,14 0,26z" opacity={0.7} />
            </g>
          </pattern>
        </defs>
        <rect width={W} height={H} fill={`url(#${id})`} />
        {frame && (
          <g transform={`translate(960 540) scale(${1 + k * 0.006}) translate(-960 -540)`}>
            <path d={cartouche(960, 540, 800, 430, 46, 16)} fill={a} stroke={b} strokeWidth={10} />
            <path d={cartouche(960, 540, 770, 402, 46, 12)} fill="none" stroke={accent} strokeWidth={5} strokeDasharray="0 20" strokeLinecap="round" />
            <path d={cartouche(960, 540, 742, 376, 46, 10)} fill="none" stroke={b} strokeWidth={2.5} opacity={0.6} />
          </g>
        )}
      </svg>
    </AbsoluteFill>
  );
};

export const Rays: React.FC<{cx: number; cy: number; n?: number; color: string; opacity?: number; rot?: number; R?: number}> = ({cx, cy, n = 24, color, opacity = 0.4, rot = 0, R = 1400}) => {
  let d = '';
  for (let i = 0; i < n; i++) {
    const a0 = ((i / n) * 360 + rot) * (Math.PI / 180), a1 = a0 + (Math.PI / n);
    d += `M${cx},${cy} L${cx + R * Math.cos(a0)},${cy + R * Math.sin(a0)} L${cx + R * Math.cos(a1)},${cy + R * Math.sin(a1)}Z`;
  }
  return <svg width={W} height={H} style={{position: 'absolute', left: 0, top: 0}}><path d={d} fill={color} opacity={opacity} /></svg>;
};

// stroke-drawn path, p 0..1
export const Draw: React.FC<{d: string; color: string; width: number; p: number; opacity?: number; fill?: string}> = ({d, color, width, p, opacity = 1, fill = 'none'}) => (
  <svg width={W} height={H} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
    <path d={d} pathLength={1} fill={fill} stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round"
      strokeDasharray="1 1" strokeDashoffset={1 - clamp01(p)} opacity={opacity} />
  </svg>
);

// little 4-point sparkles that pop and twinkle
export const Sparkles: React.FC<{t: number; pts: [number, number, number, number][]; color: string; edge?: string}> = ({t, pts, color, edge = C.ink}) => (
  <svg width={W} height={H} style={{position: 'absolute', left: 0, top: 0}}>
    {pts.map(([x, y, s, at], i) => {
      const p = pop(t, at, 6);
      if (p <= 0) return null;
      const tw = 0.75 + 0.25 * Math.abs(Math.sin((t + i * 7) / 5));
      return <path key={i} d={sparkle(s * p * tw)} transform={`translate(${x} ${y}) rotate(${jit(t, `sp${i}`, 8)})`} fill={color} stroke={edge} strokeWidth={3} />;
    })}
  </svg>
);

// falling stickers (petals, marigolds…) — deterministic
export const Rain: React.FC<{t: number; start: number; names: string[]; count: number; seed: string; size?: [number, number]; speed?: number}> = ({t, start, names, count, seed, size = [50, 110], speed = 5}) => (
  <AbsoluteFill>
    {Array.from({length: count}).map((_, i) => {
      const r = (k: string) => random(`${seed}-${i}-${k}`);
      const t0 = start + r('d') * 60;
      if (t < t0) return null;
      const lt = t - t0;
      const y = -120 + lt * speed * (0.7 + r('v') * 0.6);
      if (y > H + 150) return null;
      const x = r('x') * W + Math.sin(lt / 14 + r('p') * 6) * 50;
      const w = size[0] + r('s') * (size[1] - size[0]);
      return <Art key={i} name={names[i % names.length]} x={x} y={y} w={w} rot={lt * (r('r') - 0.5) * 6} />;
    })}
  </AbsoluteFill>
);

// ── type ────────────────────────────────────────────────────────────────────────────────
const fit = (text: string, base: number, maxW: number, k: number) => Math.min(base, maxW / Math.max(1, [...text].length * k));
// fat display word: pop + squash, layered extrusion, outline, hand jitter
export const Hero: React.FC<{text?: string; x: number; y: number; size: number; maxW?: number; color: string; dark: string; edge?: string; t: number; start: number; rot?: number}> = ({text, x, y, size, maxW = 1500, color, dark, edge = C.ink, t, start, rot = -3}) => {
  if (!text) return null;
  const p = pop(t, start, 8);
  if (p <= 0) return null;
  const fs = fit(text, size, maxW, 0.42);
  const depth = Math.round(fs / 18);
  const shadow = Array.from({length: depth}, (_, i) => `${i + 1}px ${i + 1}px 0 ${dark}`).join(',');
  return (
    <div style={{position: 'absolute', left: x, top: y, transform: `translate(-50%,-50%) rotate(${rot + jit(t, text, 1.2)}deg) scale(${p * (2 - squash(t, start))},${p * squash(t, start)})`, whiteSpace: 'nowrap',
      fontFamily: MODAK, fontSize: fs, lineHeight: 1.25, color, WebkitTextStroke: `${Math.max(6, fs / 16)}px ${edge}`, paintOrder: 'stroke fill', textShadow: shadow, letterSpacing: 2}}>
      {text}
    </div>
  );
};
// handwritten line: written on left→right, with an underline flourish
export const Script: React.FC<{text?: string; x: number; y: number; size: number; maxW?: number; color: string; edge?: string; t: number; start: number; dur?: number; rot?: number; underline?: string}> = ({text, x, y, size, maxW = 900, color, edge, t, start, dur = 10, rot = -2, underline}) => {
  if (!text) return null;
  const p = prog(t, start, start + dur, Easing.linear);
  if (p <= 0) return null;
  const fs = fit(text, size, maxW, 0.5);
  const u = prog(t, start + dur * 0.6, start + dur * 1.4);
  return (
    <div style={{position: 'absolute', left: x, top: y, transform: `translate(-50%,-50%) rotate(${rot + jit(t, text, 0.8)}deg)`, whiteSpace: 'nowrap'}}>
      <div style={{fontFamily: KALAM, fontWeight: 700, fontSize: fs, lineHeight: 1.5, color, clipPath: `inset(-20% ${(1 - p) * 100}% -20% -5%)`,
        ...(edge ? {WebkitTextStroke: `${fs / 9}px ${edge}`, paintOrder: 'stroke fill'} : {})}}>
        {text}
      </div>
      {underline && (
        <svg width="100%" height={40} viewBox="0 0 100 20" preserveAspectRatio="none" style={{position: 'absolute', left: 0, bottom: -18, overflow: 'visible'}}>
          <path d="M2,10 C20,2 30,18 50,10 S80,2 98,10" pathLength={1} fill="none" stroke={underline} strokeWidth={3.5} strokeLinecap="round"
            strokeDasharray="1 1" strokeDashoffset={1 - u} />
        </svg>
      )}
    </div>
  );
};

// ── finishing ───────────────────────────────────────────────────────────────────────────
// line boil + paper grain, redrawn on twos with a 4-drawing cycle.
// Four fixed filters (boil0–3) and the layer switches which one it points at: Chrome doesn't always repaint
// a filtered layer when only a feTurbulence seed changes. Seeds start at 1: feTurbulence clamps seed 0 to 1,
// so seeds 0 and 1 drew the same frame and the line held still for 4 frames every cycle.
export const boilUrl = (f: number) => `url(#boil${Math.floor(f / 2) % 4})`;
export const Defs: React.FC = () => {
  const f = useCurrentFrame();
  const seed = Math.floor(f / 2) % 4;
  const filt = (id: string, sd: number) => (
    <filter key={id} id={id} x="-5%" y="-5%" width="110%" height="110%">
      <feTurbulence type="fractalNoise" baseFrequency="0.018" numOctaves={2} seed={sd} result="n" />
      <feDisplacementMap in="SourceGraphic" in2="n" scale={5} xChannelSelector="R" yChannelSelector="G" />
    </filter>
  );
  return (
    <svg width={0} height={0} style={{position: 'absolute'}}>
      <defs>
        {[0, 1, 2, 3].map((k) => filt(`boil${k}`, k + 1))}
        {filt('boil', seed + 1)}
      </defs>
    </svg>
  );
};
export const Grain: React.FC = () => {
  const f = useCurrentFrame();
  const seed = Math.floor(f / 2) % 6;
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <svg width={W} height={H} style={{position: 'absolute', mixBlendMode: 'multiply', opacity: 0.22}}>
        <filter id={`g${seed}`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={2} seed={seed + 1} />
          <feColorMatrix values="0 0 0 0 0.55  0 0 0 0 0.45  0 0 0 0 0.4  0 0 0 -1.4 1.25" />
        </filter>
        <rect width={W} height={H} filter={`url(#g${seed})`} />
      </svg>
      <AbsoluteFill style={{background: 'radial-gradient(ellipse at center, rgba(0,0,0,0) 55%, rgba(42,8,18,0.35) 100%)'}} />
    </AbsoluteFill>
  );
};
