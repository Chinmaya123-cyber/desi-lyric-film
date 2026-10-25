// Desi lyric film engine. Reads three files and renders the whole film:
//   src/film.json       the shot list (kind, start time, lyric slot, background, transition, options)
//   src/lyrics.json     word-timed lines: [{t0, t1, dev:[], rom:[], times:[]}] — one entry per sung phrase ("slot")
//   src/character.json  the character: expression sets + eye anchors, eye close-up plates, look cards, twirl
// Everything sits on one persistent stage (block-print surround + scalloped marigold frame), drawings move on twos,
// the whole frame boils like hand-drawn line, and every cut lands on a sung syllable.
import React, {useEffect, useState} from 'react';
import {AbsoluteFill, Audio, Easing, Img, Sequence, continueRender, delayRender, interpolate, random, staticFile, useCurrentFrame} from 'remotion';
import {loadFont as loadYatra} from '@remotion/google-fonts/YatraOne';
import {B, BEAT0, BG, C, DURATION, DURATION_S, FPS, H, W} from './theme';
import {ART, Art, Defs, Draw, Grain, KALAM, PLATES, Rain, Rays, Sparkles, boilUrl, cartouche, clamp01, flower, heartPath, jit, pop, prog, squash} from './kit';
import FILM from './film.json';
import LYR from './lyrics.json';
import CHAR from './character.json';

const YATRA = loadYatra('normal', {subsets: ['devanagari', 'latin']}).fontFamily;

// ── data ─────────────────────────────────────────────────────────────────────────────
type Slot = {t0: number; t1: number; dev: string[]; rom: string[]; times: number[]};
const SL = LYR as Slot[];
type Mood = 'neutral' | 'front' | 'glance' | 'half' | 'closed' | 'pain' | 'relief' | 'shy' | 'dream' | 'moved';
type CharSet = {file: string; w: number; h: number; ex: number; ey: number; faces: Partial<Record<Mood, string>>};
type Card = {name: string; bg: string; w: number; h: number};
const SETS = CHAR.sets as Record<string, CharSet>;
const CARDS = (CHAR.cards ?? []) as Card[];
const CU = CHAR.closeup as null | {l: [number, number]; r: [number, number]; frames: string[]};
const TWIRL = CHAR.twirl as null | {file: string; w: number; h: number};
const cardBy = (name: string) => CARDS.find((c) => c.name === name);
Object.assign(ART, Object.fromEntries(Object.values(SETS).flatMap((s) => Object.values(s.faces).map((f) => [`char/${s.file}${f}`, [s.w, s.h]]))));
if (TWIRL) ART[`char/${TWIRL.file}`] = [TWIRL.w, TWIRL.h];

// ── time ─────────────────────────────────────────────────────────────────────────────
// t: local frames on twos (drawings) · f: local frames on ones (camera, transitions) · a: absolute frame
type Ctx = {t: number; f: number; a: number; s0: number; dur: number; bg: string};
const LEAD = 4; // a shot starts 4 frames early so its transition lands on the syllable
const beatK = (a: number, len = 0.32) => {const ph = ((((a / FPS - BEAT0) / B) % 1) + 1) % 1; return ph < len ? 1 - ph / len : 0;};
const eighth = (a: number) => {const ph = ((((a / FPS - BEAT0) / (B / 2)) % 1) + 1) % 1; return Math.max(0, 1 - ph * 3);};
const at = (c: Ctx, sec: number) => (sec - c.s0) * FPS;
const wordsF = (c: Ctx, slot: number | undefined) => (slot !== undefined && SL[slot] ? SL[slot].times.map((s) => at(c, s)) : []);

// ── look helpers ─────────────────────────────────────────────────────────────────────
const PAPER = `drop-shadow(3px 0 0 ${C.cream}) drop-shadow(-3px 0 0 ${C.cream}) drop-shadow(0 3px 0 ${C.cream}) drop-shadow(0 -3px 0 ${C.cream}) drop-shadow(9px 11px 0 rgba(42,8,18,0.3))`;
// paper cut-out: cream edge, hard shadow, small stop-motion re-registration jitter
const Paper: React.FC<{c: Ctx; seed: string; children: React.ReactNode; amt?: number}> = ({c, seed, children, amt = 2.5}) => (
  <AbsoluteFill style={{filter: PAPER, transform: `translate(${jit(c.t, seed + 'x', amt)}px,${jit(c.t, seed + 'y', amt)}px) rotate(${jit(c.t, seed + 'r', 0.25)}deg)`}}>{children}</AbsoluteFill>
);
const Cam: React.FC<{c: Ctx; push?: number; ox?: number; oy?: number; children: React.ReactNode}> = ({c, push = 0.05, ox = 50, oy = 50, children}) => (
  <AbsoluteFill style={{transform: `scale(${1 + push * clamp01(c.f / c.dur) + 0.016 * beatK(c.a)})`, transformOrigin: `${ox}% ${oy}%`}}>{children}</AbsoluteFill>
);
const isDark = (hex: string) => {const n = parseInt(hex.slice(1), 16); return 0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255) < 120;};

// a pen draws the ink outline around a cut-out (conic sweep), then the colour fills in
const Sketch: React.FC<{name: string; x: number; y: number; w: number; t: number; start: number; draw?: number; rot?: number; sx?: number; sy?: number; ink?: string}> =
  ({name, x, y, w, t, start, draw = 8, rot = 0, sx = 1, sy = 1, ink = C.velvet}) => {
  const [nw, nh] = ART[name];
  const h = (w * nh) / nw;
  const id = `sk_${name.replace(/\W/g, '')}`;
  const pen = prog(t, start, start + draw, Easing.linear);
  const fill = prog(t, start + draw * 0.75, start + draw + 4, Easing.linear);
  if (t < start) return null;
  const r = Math.max(4, (nw / w) * 5);
  return (
    <div style={{position: 'absolute', left: x - w / 2, top: y - h / 2, width: w, height: h, transform: `rotate(${rot}deg) scale(${sx},${sy})`}}>
      {fill < 1 && (
        <svg width={w} height={h} viewBox={`${-r * 2} ${-r * 2} ${nw + r * 4} ${nh + r * 4}`} preserveAspectRatio="none"
          style={{position: 'absolute', left: -(r * 2 * w) / nw, top: -(r * 2 * h) / nh, width: w + (r * 4 * w) / nw, height: h + (r * 4 * h) / nh,
            WebkitMaskImage: `conic-gradient(from 200deg, #000 ${pen * 360}deg, transparent ${pen * 360 + 0.5}deg)`, overflow: 'visible'}}>
          <defs>
            <filter id={id} x="-5%" y="-5%" width="110%" height="110%">
              <feMorphology in="SourceAlpha" operator="dilate" radius={r} result="d" />
              <feMorphology in="SourceAlpha" operator="erode" radius={r * 0.15} result="e" />
              <feComposite in="d" in2="e" operator="out" result="ring" />
              <feFlood floodColor={ink} />
              <feComposite in2="ring" operator="in" />
            </filter>
          </defs>
          <image href={staticFile(`art/${name}.png`)} width={nw} height={nh} filter={`url(#${id})`} />
        </svg>
      )}
      {fill > 0 && <Art name={name} x={w / 2} y={h / 2} w={w} reveal={fill} />}
    </div>
  );
};

// ── lettering ────────────────────────────────────────────────────────────────────────
// one type system: refrain lines in the brush display face (Yatra One), other lines handwritten (Kalam).
// hairline outline in a palette colour + one offset shadow (risograph misregistration). Light grounds: plum/velvet,
// dark grounds: cream/peach. Roman line sits under the Devanagari, word-synced.
type Look = {fg: string; dark: string; hi: string; rom: string};
const TN: Look = {fg: C.plum, dark: C.marigold, hi: C.rani, rom: C.velvet};
const LN: Look = {fg: C.velvet, dark: C.rani, hi: C.scarlet, rom: C.plum};
const TN_D: Look = {fg: C.cream, dark: C.rani, hi: C.marigold, rom: C.peach};
const LN_D: Look = {fg: C.peach, dark: C.rani, hi: C.marigold, rom: C.cream};
const lookFor = (c: Ctx, refrain: boolean) => (isDark(c.bg) ? (refrain ? TN_D : LN_D) : refrain ? TN : LN);
const BRUSH: React.CSSProperties = {WebkitMaskImage: `url(${staticFile('art/brush.png')})`, WebkitMaskSize: '180px 180px'};

type Style = 'slam' | 'write' | 'converge' | 'pulse' | 'giant' | 'arc' | 'bounce' | 'twinkle' | 'soft';
const Lyric: React.FC<{c: Ctx; slot?: number; style: Style; x: number; y: number; maxW: number; size: number; look: Look; rot?: number; arcR?: number}> =
  ({c, slot, style, x, y, maxW, size, look, rot = -2, arcR = 380}) => {
  const L = slot === undefined ? undefined : SL[slot];
  if (!L || !L.dev.length) return null;
  const wf = L.times.map((s) => at(c, s));
  const lit = wf.reduce((k, f, i) => (c.t >= f - 1 ? i : k), -1);
  if (lit < 0) return null;
  const chars = L.dev.join(' ').length;
  const hand = style === 'write' || style === 'twinkle' || style === 'soft';
  const fs = Math.min(size, (maxW / Math.max(1, chars)) * (hand ? 1.85 : 1.6));
  const romFs = Math.max(30, Math.min(58, fs * 0.42));
  const devFont = hand ? KALAM : YATRA;
  if (style === 'arc') {
    const top = `M${x - arcR},${y} A${arcR},${arcR} 0 0 1 ${x + arcR},${y}`;
    const bot = `M${x - arcR - 40},${y} A${arcR + 40},${arcR + 40} 0 0 0 ${x + arcR + 40},${y}`;
    return (
      <svg width={W} height={H} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible', transform: `rotate(${(c.t / FPS) * 14}deg)`, transformOrigin: `${x}px ${y}px`}}>
        <defs><path id={`at${slot}`} d={top} /><path id={`ab${slot}`} d={bot} /></defs>
        <text fontFamily={YATRA} fontSize={fs} fill={look.fg} stroke={look.dark} strokeWidth={Math.max(1.5, fs / 50)} paintOrder="stroke" textAnchor="middle" style={{filter: `drop-shadow(3px 3px 0 ${look.dark})`}}>
          <textPath href={`#at${slot}`} startOffset="50%">{L.dev.map((w, i) => <tspan key={i} fill={i === lit ? look.hi : look.fg} opacity={c.t >= wf[i] - 1 ? 1 : 0}>{w + ' '}</tspan>)}</textPath>
        </text>
        <text fontFamily={KALAM} fontWeight={700} fontSize={romFs} fill={look.rom} stroke={look.dark} strokeWidth={1.5} paintOrder="stroke" textAnchor="middle" dominantBaseline="hanging">
          <textPath href={`#ab${slot}`} startOffset="50%">{L.rom.map((w, i) => <tspan key={i} opacity={c.t >= wf[i] - 1 ? 1 : 0}>{w + ' '}</tspan>)}</textPath>
        </text>
      </svg>
    );
  }
  const n = L.dev.length;
  const word = (w: string, i: number, kind: 'dev' | 'rom') => {
    const f = wf[Math.min(i, wf.length - 1)] - 1;
    const s = kind === 'dev' ? fs : romFs;
    if (c.t < f) return <span key={kind + i} style={{display: 'inline-block', opacity: 0, margin: `0 ${s * 0.18}px`, fontSize: s}}>{w}</span>;
    const lt = c.t - f;
    const isLit = i === lit;
    let tf = `rotate(${jit(c.t, w + i + 'jr', 2.5)}deg)`, op = 1, clip: string | undefined;
    const p = pop(c.t, f, 6), sq = squash(c.t, f, 6);
    if (style === 'slam' || style === 'giant') tf += ` scale(${p * (2 - sq) * (isLit ? 1.08 : 1)},${p * sq * (isLit ? 1.08 : 1)})`;
    if (style === 'pulse') tf = `scale(${p * (1 + 0.12 * eighth(c.a))}) translate(${jit(c.t, w + i, 3)}px,${jit(c.t, w + i + 'y', 3)}px)`;
    if (style === 'converge') tf = `translateX(${(i - (n - 1) / 2) * 520 * (1 - prog(c.t, f, f + 6, Easing.bezier(0.2, 0.9, 0.3, 1.2)))}px) scale(${pop(c.t, f, 4)})`;
    if (style === 'bounce') tf = `translateY(${interpolate(clamp01(lt / 8), [0, 0.5, 0.7, 0.85, 1], [-260, 0, -40, 0, 0])}px) rotate(${jit(c.t, w + i, 4)}deg)`;
    if (hand) {
      const wp = prog(c.t, f, f + (style === 'soft' ? 10 : 6), Easing.linear);
      clip = `inset(-30% ${(1 - wp) * 100}% -30% -5%)`;
      if (style === 'soft') op = wp;
      tf = `translateY(${(1 - wp) * 14}px)`;
    }
    // words leave too: scatter up and away over the last frames of the shot
    const out = prog(c.f, c.dur - 8, c.dur + 2, Easing.in(Easing.quad));
    if (out > 0) { tf += ` translate(${(i - (n - 1) / 2) * 60 * out}px, ${-110 * out}px) rotate(${(i % 2 ? 1 : -1) * 28 * out}deg) scale(${1 - 0.4 * out})`; op *= 1 - out; }
    const color = kind === 'dev' ? (isLit && style !== 'soft' ? look.hi : look.fg) : look.rom;
    return (
      <span key={kind + i} style={{display: 'inline-block', margin: `0 ${s * 0.18}px`, ...BRUSH, translate: `${jit(c.t, w + i + 'jx', 2.5)}px ${jit(c.t, w + i + 'jy', 2.5)}px`,
        fontFamily: kind === 'dev' ? devFont : style === 'slam' || style === 'giant' || style === 'pulse' ? YATRA : KALAM,
        fontWeight: 700, fontSize: s, color, opacity: op, clipPath: clip, transform: tf, transformOrigin: '50% 75%', lineHeight: kind === 'dev' ? 1.25 : 1.1,
        ...(kind === 'dev'
          ? {WebkitTextStroke: `${Math.max(1.5, s / 60)}px ${look.dark}`, paintOrder: 'stroke fill' as const, textShadow: `${Math.round(s / 26)}px ${Math.round(s / 26)}px 0 ${look.dark}`}
          : {WebkitTextStroke: `${Math.max(1.2, s / 40)}px ${look.dark}`, paintOrder: 'stroke fill' as const, textShadow: `2px 2px 0 ${look.dark}`}),
        ...(style === 'twinkle' && kind === 'dev' ? {textShadow: `0 0 ${18 + 10 * Math.sin(c.t / 3 + i)}px ${C.flossy}, 3px 3px 0 ${look.dark}`} : {})}}>
        {w}
      </span>
    );
  };
  const giant = style === 'giant' ? 0.55 + 0.45 * prog(c.t, wf[0], wf[0] + 30, Easing.bezier(0.2, 0.8, 0.3, 1)) + 0.04 * Math.sin(c.t / 6) : 1;
  return (
    <div style={{position: 'absolute', left: x - maxW / 2, width: maxW, textAlign: 'center',
      ...(style === 'giant' ? {top: y, transform: `translateY(-50%) rotate(${rot}deg) scale(${giant})`} : y < 540 ? {top: y - fs * 0.62} : {bottom: H - y - fs * 0.62}),
      ...(style === 'giant' ? {} : {transform: `rotate(${rot + jit(c.t, 'line' + slot, 0.8)}deg)`, transformOrigin: y < 540 ? '50% 0%' : '50% 100%'})}}>
      <div style={{whiteSpace: style === 'converge' ? 'nowrap' : undefined}}>{L.dev.map((w, i) => word(w, i, 'dev'))}</div>
      {L.rom.length > 0 && <div style={{marginTop: 2}}>{L.rom.map((w, i) => word(w, i, 'rom'))}</div>}
    </div>
  );
};
// a lyric written along an eye's border: Devanagari over the upper lid of one eye, Roman under the other
const EyeRing: React.FC<{c: Ctx; slot?: number; look: Look; a: [number, number]; b: [number, number]; rx?: number; ry?: number}> = ({c, slot, look, a, b, rx = 300, ry = 150}) => {
  const L = slot === undefined ? undefined : SL[slot];
  if (!L || !L.dev.length) return null;
  const wf = L.times.map((s) => at(c, s));
  if (c.t < wf[0] - 1) return null;
  const lit = wf.reduce((k, f, i) => (c.t >= f - 1 ? i : k), 0);
  const br = 1 + 0.04 * beatK(c.a);
  const upper = `M${a[0] - rx * br},${a[1] + 10} Q${a[0]},${a[1] - ry * 2 * br} ${a[0] + rx * br},${a[1] + 10}`;
  const lower = `M${b[0] - rx * br},${b[1] - 10} Q${b[0]},${b[1] + ry * 2 * br} ${b[0] + rx * br},${b[1] - 10}`;
  const span = (ws: string[], kind: 'dev' | 'rom') => ws.map((w, i) => (
    <tspan key={i} opacity={c.t >= wf[Math.min(i, wf.length - 1)] - 1 ? 1 : 0} fill={kind === 'dev' ? (i === lit ? look.hi : look.fg) : look.rom} dy={jit(c.t, w + i + kind, 4)}>{w + ' '}</tspan>
  ));
  return (
    <svg width={W} height={H} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible', transform: `rotate(${jit(c.t, 'ring' + slot, 1.5)}deg)`}}>
      <defs><path id={`eu${slot}`} d={upper} /><path id={`el${slot}`} d={lower} /></defs>
      <text fontFamily={YATRA} fontSize={140} letterSpacing={3} stroke={look.dark} strokeWidth={2.5} paintOrder="stroke" textAnchor="middle" style={{filter: `drop-shadow(4px 4px 0 ${look.dark})`}}>
        <textPath href={`#eu${slot}`} startOffset="50%">{span(L.dev, 'dev')}</textPath>
      </text>
      {L.rom.length > 0 && (
        <text fontFamily={KALAM} fontWeight={700} fontSize={80} stroke={look.dark} strokeWidth={2} paintOrder="stroke" textAnchor="middle" dominantBaseline="hanging" style={{filter: `drop-shadow(2px 2px 0 ${look.dark})`}}>
          <textPath href={`#el${slot}`} startOffset="50%">{span(L.rom, 'rom')}</textPath>
        </text>
      )}
    </svg>
  );
};
// a kohl-wing swoosh drawn under a refrain
const Swoosh: React.FC<{c: Ctx; slot?: number; x: number; y: number; w: number}> = ({c, slot, x, y, w}) => {
  const wf = wordsF(c, slot);
  if (!wf.length) return null;
  return <Draw d={`M${x - w / 2},${y} C${x - w / 4},${y + 46} ${x + w / 4},${y + 46} ${x + w / 2},${y - 10} L${x + w / 2 + 70},${y - 40}`} color={C.peacock} width={14} p={prog(c.t, wf[0], wf[0] + 8)} />;
};

// ── character ────────────────────────────────────────────────────────────────────────
const setOf = (name?: string) => SETS[name ?? Object.keys(SETS)[0]] ?? Object.values(SETS)[0];
const faceFile = (s: CharSet, m: Mood) => `char/${s.file}${s.faces[m] ?? s.faces.neutral ?? ''}`;
const Girl: React.FC<{c: Ctx; mood: Mood; set?: string; x?: number; w?: number}> = ({c, mood, set, x = 1180, w = 720}) => {
  const s = setOf(set), h = (w * s.h) / s.w;
  return <Paper c={c} seed="char" amt={1.6}><Art name={faceFile(s, mood)} x={x} y={H - h / 2 + 40 + 3 * Math.sin(c.t / 9)} w={w} /></Paper>;
};
const headOf = (set?: string, x = 1180, w = 720) => {const s = setOf(set), h = (w * s.h) / s.w; return {x: x + (s.ex - 0.5) * w, y: H - h + 40 + s.ey * h};};
const moodAt = (t: number, ev: [number, Mood][]): Mood => ev.reduce<Mood>((m, [f, st]) => (t >= f ? st : m), ev[0]?.[1] ?? 'neutral');
// hand-drawn zigzag doodles radiating around her head
const Zigs: React.FC<{c: Ctx; cx: number; cy: number; r: number; color?: string; kick?: number; draw?: number; spin?: number}> = ({c, cx, cy, r, color = C.cream, kick = 0, draw = 1, spin = 0}) => {
  let d = '';
  for (let i = 0; i < 9; i++) {
    const a = (-200 + (i / 8) * 220 + spin) * (Math.PI / 180);
    const r0 = r * (1 + 0.1 * kick), r1 = r0 + 95 + 30 * kick, nx = -Math.sin(a), ny = Math.cos(a);
    for (let k = 0; k <= 6; k++) {
      const rr = r0 + ((r1 - r0) * k) / 6, side = (k % 2 ? 1 : -1) * 13 + jit(c.t, `z${i}${k}`, 2);
      d += `${k ? 'L' : 'M'}${cx + Math.cos(a) * rr + nx * side},${cy + Math.sin(a) * rr + ny * side}`;
    }
  }
  return <Draw d={d} color={color} width={15} p={draw} />;
};
const CuPlate: React.FC<{c: Ctx; frame: string; push?: number}> = ({c, frame, push = 0.06}) => (
  <AbsoluteFill style={{transform: `scale(${1.04 + push * clamp01(c.f / c.dur) + 0.012 * beatK(c.a)}) translate(${jit(c.t, 'cu', 2)}px,${jit(c.t, 'cv', 2)}px)`}}>
    <Img src={staticFile(`art/char/cu_${CU?.frames.includes(frame) ? frame : 'open'}.jpg`)} style={{width: '100%', height: '100%'}} />
  </AbsoluteFill>
);
const CardImg: React.FC<{c: Ctx; card: Card; cf: number; cx?: number; blinkAt?: number}> = ({c, card, cf, cx = 1250, blinkAt = 8}) => {
  const ch = 1010, cw = (ch * card.w) / card.h;
  return (
    <AbsoluteFill style={{transform: `scale(${1.06 - 0.06 * clamp01(cf / 6) + 0.012 * beatK(c.a)}) rotate(${jit(c.t, card.name, 0.8)}deg)`, transformOrigin: `${cx}px 460px`}}>
      <Img src={staticFile(`art/cards/${card.name}${cf >= blinkAt && cf < blinkAt + 3 ? '_closed' : ''}.jpg`)} style={{position: 'absolute', left: cx - cw / 2, top: 540 - ch / 2 + 20, width: cw, height: ch}} />
    </AbsoluteFill>
  );
};

// ── shot kinds ───────────────────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Shot = {t: number; kind: string; slot?: number; [k: string]: any};
type ShotFC = React.FC<{c: Ctx; s: Shot}>;

// carved double doors filling the frame, hinged at its edges
const FRAME = {a: 850, b: 478};
const Doors: React.FC<{open: number}> = ({open}) => {
  if (open >= 1) return null;
  const top = 540 - FRAME.b, h = FRAME.b * 2, half = FRAME.a, pw = half / 2;
  const leaf = (side: -1 | 1) => (
    <div style={{position: 'absolute', top, height: h, width: half, left: side < 0 ? 960 - half : 960, transform: `perspective(1800px) rotateY(${side * -open * 100}deg)`,
      transformOrigin: side < 0 ? '0% 50%' : '100% 50%', filter: `brightness(${1 - open * 0.35}) drop-shadow(${side * -14}px 0 0 rgba(42,8,18,${0.4 * (1 - open)}))`}}>
      {[0, 1].map((k) => <Img key={k} src={staticFile('art/door.png')} style={{position: 'absolute', left: k * pw, top: 0, width: pw, height: h, transform: k === (side < 0 ? 1 : 0) ? 'scaleX(-1)' : undefined}} />)}
    </div>
  );
  return <AbsoluteFill>{leaf(-1)}{leaf(1)}</AbsoluteFill>;
};

// open — doors swing open (s.doors = [start, end] seconds), she is behind them; eyes open on the first line's words
const KOpen: ShotFC = ({c, s}) => {
  const [d0, d1] = s.doors ?? [c.s0 + 0.4, c.s0 + 1.5];
  const open = prog(c.f, at(c, d0), at(c, d1), Easing.bezier(0.45, 0, 0.2, 1));
  const wf = wordsF(c, s.slot), hd = headOf(s.set);
  const w0 = wf[0] ?? 1e9, w1 = wf[1] ?? w0 + 4;
  const mood = moodAt(c.t, [[-99, 'closed'], [w0, 'half'], [w1, 'front'], [w1 + 12, 'half'], [w1 + 14, 'neutral']]);
  return (
    <AbsoluteFill>
      <Lyric c={c} slot={s.slot} style="slam" x={760} y={470} maxW={1300} size={230} look={lookFor(c, true)} />
      <Cam c={c} push={0.07} ox={60} oy={40}>
        <Sparkles t={c.t} color={C.cream} pts={[[700, 260, 18, 6], [1520, 220, 24, 14], [1640, 520, 16, 20], [760, 600, 20, 30]]} />
        <Zigs c={c} cx={hd.x} cy={hd.y} r={250} kick={c.t >= w1 ? 1 - prog(c.t, w1, w1 + 10) : 0} draw={prog(c.t, w1 - 2, w1 + 6)} />
        <Girl c={c} set={s.set} mood={mood} />
      </Cam>
      <Doors open={open} />
    </AbsoluteFill>
  );
};

// character — her mood carries the line: calm | shy | pain (→ relief on s.reliefWord) | dream | moved
const KCharacter: ShotFC = ({c, s}) => {
  const mood: string = s.mood ?? 'calm';
  const wf = wordsF(c, s.slot), hd = headOf(s.set);
  const look = lookFor(c, !!s.refrain);
  const style: Style = s.style ?? (mood === 'moved' ? 'soft' : mood === 'shy' ? 'pulse' : s.refrain ? 'slam' : 'write');
  const lyric = <Lyric c={c} slot={s.slot} style={style} x={720} y={470} maxW={1250} size={s.refrain ? 220 : 190} look={look} />;
  if (mood === 'pain') {
    const ri = s.reliefWord ?? Math.max(0, wf.length - 1);
    const rel = wf[ri] ?? 1e9, z = wf[0] ?? 0, pe = wf[1] ?? z + 6;
    const healed = c.t >= rel, glow = prog(c.t, rel, rel + 10);
    const shake = c.t >= pe && c.t < pe + 6 && !healed ? jit(c.t, 'sh', 9) : 0;
    const cracks = Array.from({length: 7}, (_, i) => {
      const a = (-170 + i * 30) * (Math.PI / 180);
      let d = `M${hd.x + Math.cos(a) * 230},${hd.y + Math.sin(a) * 230}`;
      for (let k = 1; k <= 4; k++) d += ` L${hd.x + Math.cos(a + (k % 2 ? 0.09 : -0.07)) * (230 + k * 55)},${hd.y + Math.sin(a + (k % 2 ? 0.09 : -0.07)) * (230 + k * 55)}`;
      return d;
    });
    return (
      <AbsoluteFill style={{transform: `translateX(${shake}px)`}}>
        <AbsoluteFill style={{background: `radial-gradient(circle at ${hd.x}px ${hd.y}px, transparent 120px, ${C.velvet} 900px)`, opacity: 0.45 * (1 - glow)}} />
        {lyric}
        <Cam c={c} ox={60} oy={35}>
          {cracks.map((d, i) => <Draw key={i} d={d} color={C.scarlet} width={12} p={prog(c.t, z + i, z + i + 5)} opacity={1 - glow} />)}
          <AbsoluteFill style={{background: `radial-gradient(circle at ${hd.x}px ${hd.y - 200}px, ${C.cream}dd 0, ${C.marigold}88 ${260 * glow}px, transparent ${700 * glow + 1}px)`, opacity: glow}} />
          <Girl c={c} set={s.set} mood={healed ? 'relief' : 'pain'} />
          {healed && <Sparkles t={c.t} color={C.cream} pts={[[hd.x - 80, hd.y + 90, 16, rel + 2], [hd.x + 140, hd.y - 160, 22, rel + 4], [hd.x - 220, hd.y - 120, 18, rel + 6]]} />}
        </Cam>
      </AbsoluteFill>
    );
  }
  if (mood === 'dream') {
    const g0 = wf[0] ?? 0, g2 = wf[wf.length - 1] ?? g0 + 12;
    const away = prog(c.t, g0, g2 + 6, Easing.in(Easing.quad));
    return (
      <AbsoluteFill>
        <Rays cx={hd.x} cy={hd.y} color={C.peacock} opacity={0.08} rot={c.t * 0.4} R={1300} n={26} />
        {lyric}
        <Cam c={c} ox={60} oy={35}>
          <Sparkles t={c.t} color={C.cream} pts={Array.from({length: 10}, (_, i) => [700 + random(`dx${i}`) * 1000, 140 + random(`dy${i}`) * 500, 10 + random(`ds${i}`) * 14, i * 2] as [number, number, number, number])} />
          <Art name="globe" x={interpolate(away, [0, 1], [hd.x + 330, hd.x + 640])} y={interpolate(away, [0, 1], [hd.y - 150, hd.y - 420])} w={260 * (1 - away * 0.9)} rot={c.t * 3} opacity={1 - away * 0.8} />
          <Zigs c={c} cx={hd.x} cy={hd.y} r={240} spin={c.t * 0.6} color={isDark(c.bg) ? C.marigold : C.cream} />
          <Girl c={c} set={s.set} mood="dream" />
        </Cam>
      </AbsoluteFill>
    );
  }
  if (mood === 'moved') {
    const chest = {x: hd.x + 20, y: hd.y + 330};
    const glow = prog(c.t, wf[0] ?? 0, (wf[0] ?? 0) + 12);
    const blooms: [number, number, string][] = [[-0.9, 300, 'st/marigold'], [-2.3, 320, 'st/jasmine'], [0.2, 330, 'st/rose'], [-1.6, 360, 'st/marigold'], [-0.35, 380, 'st/jasmine']];
    return (
      <AbsoluteFill>
        <AbsoluteFill style={{background: `radial-gradient(circle at ${chest.x}px ${chest.y}px, ${C.flossy}cc 0, ${C.rani}44 ${300 * glow}px, transparent ${760 * glow + 1}px)`}} />
        {lyric}
        <Cam c={c} ox={60} oy={40} push={0.08}>
          <svg width={W} height={H} style={{position: 'absolute'}}>
            {wf.map((f, i) => {const p = prog(c.t, f, f + 18); return c.t >= f && p < 1 ? <path key={i} d={heartPath(chest.x, chest.y - 40, 120 + p * 420)} fill="none" stroke={i % 2 ? C.cream : C.rani} strokeWidth={9} opacity={1 - p} /> : null;})}
          </svg>
          <Zigs c={c} cx={hd.x} cy={hd.y} r={240} kick={wf.reduce((k, f) => (c.t >= f && c.t < f + 6 ? 1 - (c.t - f) / 6 : k), 0)} />
          <Girl c={c} set={s.set} mood={c.t >= (wf[0] ?? 0) ? 'moved' : 'closed'} />
          {blooms.map(([a, r, n], i) => {const f = wf[Math.min(i, wf.length - 1)] ?? 0; const p = pop(c.t, f, 8); return p > 0 ? <Art key={i} name={n} x={hd.x + Math.cos(a) * r} y={hd.y + Math.sin(a) * r} w={110 * p} rot={jit(c.t, 'b' + i, 6) + c.t * (i % 2 ? 1 : -1)} /> : null;})}
        </Cam>
      </AbsoluteFill>
    );
  }
  if (mood === 'shy') {
    const th = eighth(c.a);
    return (
      <AbsoluteFill>
        <Rays cx={hd.x} cy={hd.y} color={C.rani} opacity={0.1 + 0.08 * th} rot={c.t * 0.8} R={1300} n={22} />
        {lyric}
        <Cam c={c} ox={60} oy={35}>
          <Zigs c={c} cx={hd.x} cy={hd.y} r={240} kick={th} />
          <Girl c={c} set={s.set} mood="shy" />
          {wf.map((f, i) => {const p = prog(c.t, f, f + 16); if (c.t < f || p >= 1) return null; const a = (-150 + i * 40) * (Math.PI / 180);
            return <Art key={i} name="st/heart" x={hd.x + Math.cos(a) * (260 + p * 160)} y={hd.y + Math.sin(a) * (260 + p * 160)} w={(70 + 20 * th) * pop(c.t, f, 4)} opacity={1 - p * 0.7} rot={jit(c.t, 'h' + i, 8)} />;})}
        </Cam>
      </AbsoluteFill>
    );
  }
  // calm: side-eye / straight gaze, doodles kick on each word
  const m: Mood = s.face ?? (s.refrain ? 'front' : 'neutral');
  return (
    <AbsoluteFill>
      {lyric}
      <Cam c={c} push={0.08} ox={60} oy={30}>
        <Zigs c={c} cx={hd.x} cy={hd.y} r={240} kick={Math.max(beatK(c.a), wf.reduce((k, f) => (c.t >= f && c.t < f + 6 ? 1 - (c.t - f) / 6 : k), 0))} spin={-c.t * 0.3} />
        <Girl c={c} set={s.set} mood={m} />
      </Cam>
    </AbsoluteFill>
  );
};

// eyes — close-up of her eyes: closed → half on word 1 → s.gaze on word 2, lyric curved along the lids.
// s.then = a following slot shown as a written line, with s.ending 'lower' (lids lower, stars drift in) or 'shy'
const KEyes: ShotFC = ({c, s}) => {
  const wf = wordsF(c, s.slot), w0 = wf[0] ?? 0, w1 = wf[1] ?? w0 + 4;
  const nf = wordsF(c, s.then), end = c.dur;
  const gaze: string = s.gaze ?? 'open';
  let fr = c.t < w0 ? 'closed' : c.t < w1 ? 'half' : gaze;
  if (nf.length && s.ending === 'lower') fr = c.t >= nf[nf.length - 1] ? 'closed' : c.t >= nf[0] ? 'half' : fr;
  else if (nf.length && s.glanceOn !== undefined && c.t >= nf[s.glanceOn] && c.t < (nf[s.glanceOn + 2] ?? end)) fr = 'glance';
  if (c.t >= end - 8 && c.t < end - 6) fr = 'half'; else if (c.t >= end - 6 && c.t < end - 4) fr = 'closed';
  const l = CU?.l ?? [627, 635], r = CU?.r ?? [1370, 626];
  const flip = (s.slot ?? 0) % 2 === 1;
  return (
    <AbsoluteFill>
      <CuPlate c={c} frame={fr} push={0.08} />
      <Sparkles t={c.t} color={C.cream} edge={C.ink} pts={[[l[0] + 40, l[1] - 30, 28, w1 + 1], [r[0] + 40, r[1] - 30, 28, w1 + 3]]} />
      {nf.length > 0 && s.ending === 'lower' && Array.from({length: 8}).map((_, i) => {
        const f0 = nf[0] + i * 3, p = prog(c.t, f0, f0 + 18, Easing.in(Easing.quad));
        if (c.t < f0 || p >= 1) return null;
        const [tx, ty] = i % 2 ? r : l;
        return <Art key={i} name="st/star" x={interpolate(p, [0, 1], [200 + random(`ls${i}`) * 1520, tx])} y={interpolate(p, [0, 1], [90 + random(`ly${i}`) * 160, ty - 40])} w={80 * (1 - p * 0.85)} rot={c.t * 6} />;
      })}
      {!nf.length || c.t < nf[0] - 1
        ? <EyeRing c={c} slot={s.slot} look={TN} a={(flip ? l : r) as [number, number]} b={(flip ? r : l) as [number, number]} />
        : <Lyric c={c} slot={s.then} style="write" x={960} y={s.ending === 'lower' ? 905 : 205} maxW={1500} size={110} look={{...LN, fg: C.cream, dark: C.velvet, rom: C.mellow}} />}
    </AbsoluteFill>
  );
};

// cards — a different look snaps in on every word (outfit + background change, a blink on the last)
const KCards: ShotFC = ({c, s}) => {
  const wf = wordsF(c, s.slot);
  const names: string[] = s.cards ?? CARDS.map((k) => k.name);
  const k = Math.max(0, wf.reduce((n, f, i) => (c.t >= f - 1 ? i : n), 0));
  const card = cardBy(names[k % names.length]) ?? CARDS[0];
  if (!card) return null;
  const cf = c.t - (wf[k] ?? 0), th = eighth(c.a);
  return (
    <AbsoluteFill style={{background: card.bg}}>
      <CardImg c={c} card={card} cf={cf} blinkAt={k === wf.length - 1 ? 4 : 99} />
      {s.hearts !== false && wf.map((f, i) => {const p = prog(c.t, f, f + 16); if (c.t < f || p >= 1) return null; const a = (-160 + i * 45) * (Math.PI / 180);
        return <Art key={i} name="st/heart" x={1250 + Math.cos(a) * (300 + p * 160)} y={420 + Math.sin(a) * (300 + p * 160)} w={(70 + 24 * th) * pop(c.t, f, 4)} opacity={1 - p * 0.7} rot={jit(c.t, 'h' + i, 8)} />;})}
      <Lyric c={{...c, bg: card.bg}} slot={s.slot} style={s.style ?? 'pulse'} x={520} y={560} maxW={720} size={120} look={lookFor({...c, bg: card.bg}, !!s.refrain)} />
    </AbsoluteFill>
  );
};

// prop — a poetic object carries the line (literal-but-lyrical, drawn on with the pen-outline reveal)
const KProp: ShotFC = ({c, s}) => {
  const wf = wordsF(c, s.slot), last = wf[wf.length - 1] ?? c.dur / 2, refrain = !!s.refrain;
  const look = lookFor(c, refrain);
  const top = (style: Style, size = 120) => <Lyric c={c} slot={s.slot} style={style} x={960} y={205} maxW={1500} size={size} look={look} />;
  const bottom = (style: Style, size = 160) => <Lyric c={c} slot={s.slot} style={style} x={960} y={900} maxW={1400} size={size} look={look} />;
  const eyeFrames = (ev: [number, string][]) => ev.reduce((st, [f, x]) => (c.t >= f ? x : st), ev[0][1]);
  switch (s.prop) {
    case 'sunEye': { // a big kohl eye opens on the refrain
      const st = eyeFrames([[-99, 'eye_closed'], [wf[0] ?? 0, 'eye_half'], [(wf[0] ?? 0) + 2, 'eye'], [c.dur - 8, 'eye_half'], [c.dur - 6, 'eye_closed'], [c.dur - 4, 'eye']]);
      return (<AbsoluteFill><Rays cx={960} cy={480} color={C.scarlet} opacity={0.12} rot={c.t * 0.6} R={1200} n={28} />
        <Cam c={c} push={0.06}><AbsoluteFill style={{background: `radial-gradient(circle at 960px 480px, ${C.marigold}aa 0, transparent ${380 + 40 * beatK(c.a)}px)`}} />
          <Paper c={c} seed="sun"><Art name={st} x={960} y={480} w={1080} /></Paper></Cam>
        <Swoosh c={c} slot={s.slot} x={960} y={930} w={620} />{bottom('slam', 170)}</AbsoluteFill>);
    }
    case 'peacockEye': {
      const open = pop(c.t, 0, 10), sq = c.t >= c.dur - 8 && c.t < c.dur - 2 ? 0.15 : 1;
      return (<AbsoluteFill><Cam c={c} oy={85}>
        {Array.from({length: 11}).map((_, i) => <Art key={i} name="feather" x={960} y={710} w={208} origin="50% 100%" rot={interpolate(i, [0, 10], [-74, 74]) * open + Math.sin(c.t / 6 + i) * 2} />)}
        <Paper c={c} seed="pe"><Art name="eyes/eyes_2" x={960} y={760} w={560 * open} sy={sq} /></Paper></Cam>
        <Swoosh c={c} slot={s.slot} x={960} y={250} w={620} />{top('slam', 160)}</AbsoluteFill>);
    }
    case 'lotusEye': case 'starEye': {
      const name = s.prop === 'lotusEye' ? 'eyes/eyes_1' : 'eyes/eyes_3';
      return (<AbsoluteFill><Rays cx={960} cy={500} color={C.rani} opacity={0.1} rot={c.t * 0.5} R={1200} n={24} />
        <Cam c={c}><Paper c={c} seed="le"><Art name={name} x={960} y={480} w={980} sx={pop(c.t, 0, 8)} sy={pop(c.t, 0, 8) * (c.t >= c.dur - 8 && c.t < c.dur - 2 ? 0.2 : 1)} /></Paper></Cam>
        <Swoosh c={c} slot={s.slot} x={960} y={960} w={620} />{bottom('slam')}</AbsoluteFill>);
    }
    case 'galaxyEye': {
      const fall = prog(c.t, 0, 8, Easing.in(Easing.quad));
      return (<AbsoluteFill><Rays cx={960} cy={470} color={C.peacock} opacity={0.14} rot={-c.t * 0.6} R={1300} n={30} />
        <Cam c={c}><Paper c={c} seed="gx"><Art name="eye_universe" x={960} y={470} w={1060} sy={c.t >= c.dur - 8 && c.t < c.dur - 2 ? 0.12 : 1} /></Paper>
          {fall < 1 && <Art name="globe" x={interpolate(fall, [0, 1], [1500, 960])} y={interpolate(fall, [0, 1], [150, 470])} w={200 * (1 - fall)} rot={c.t * 8} />}</Cam>
        <Swoosh c={c} slot={s.slot} x={960} y={965} w={620} />{bottom('slam')}</AbsoluteFill>);
    }
    case 'path': { // an ink road winds to a rising sun, diyas light along it one by one
      const road = 'M960,1060 C700,960 1220,880 930,780 S1040,650 960,575';
      const lamps: [number, number, number][] = [[760, 950, 120], [1170, 900, 108], [800, 820, 92], [1100, 770, 80], [870, 700, 66], [1050, 660, 56], [910, 620, 46], [1005, 600, 40]];
      const draw = prog(c.t, -2, 10);
      return (<AbsoluteFill><Cam c={c} push={0.14} oy={56}>
        <svg width={W} height={H} style={{position: 'absolute'}}>
          <circle cx={960} cy={575} r={(120 + 14 * beatK(c.a)) * pop(c.t, 0, 8)} fill={C.scarlet} stroke={C.velvet} strokeWidth={6} />
          <path d="M140,575 L1780,575" stroke={C.velvet} strokeWidth={6} strokeLinecap="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - prog(c.t, -4, 6)} />
          <rect x={0} y={578} width={W} height={H} fill={c.bg} />
          <path d={road} fill="none" stroke={C.velvet} strokeWidth={118} strokeLinecap="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - draw} />
          <path d={road} fill="none" stroke={C.peach} strokeWidth={100} strokeLinecap="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - draw} />
          <path d={road} fill="none" stroke={C.rani} strokeWidth={6} strokeDasharray="4 26" strokeLinecap="round" opacity={draw} />
        </svg>
        {lamps.map(([x, y, w], i) => {const on = pop(c.t, 2 + i * 2, 6); return on > 0 ? (<React.Fragment key={i}>
          <AbsoluteFill style={{background: `radial-gradient(circle at ${x}px ${y - w * 0.5}px, ${C.cream}cc 0, transparent ${w * 0.9}px)`, opacity: on}} />
          <Art name="diya" x={x} y={y} w={w * on} rot={jit(c.t, 'd' + i, 3)} /></React.Fragment>) : null;})}
        <Rain t={c.t} start={0} names={['st/petal', 'st/marigold']} count={8} seed="path" size={[40, 70]} speed={6} />
      </Cam>{top('write')}</AbsoluteFill>);
    }
    case 'heartsMeet': { // the distance between two hearts is erased word by word
      const meet = prog(c.t, wf[0] ?? 0, last, Easing.bezier(0.5, 0, 0.3, 1)), gap = interpolate(meet, [0, 1], [640, 70]), met = c.t >= last;
      return (<AbsoluteFill><Cam c={c}>
        <svg width={W} height={H} style={{position: 'absolute'}}><line x1={960 - gap} y1={560} x2={960 + gap} y2={560} stroke={C.velvet} strokeWidth={10} strokeDasharray="26 22" strokeDashoffset={c.t * 4} strokeLinecap="round" /></svg>
        {met && <Rays cx={960} cy={560} color={C.rani} opacity={0.14} rot={c.t} R={900} n={16} />}
        <Paper c={c} seed="h1"><Art name="st/heart" x={960 - gap - 40} y={560} w={met ? 260 : 210} rot={-12 + jit(c.t, 'a', 4)} /></Paper>
        <Paper c={c} seed="h2"><Art name="st/heart" x={960 + gap + 40} y={560} w={met ? 260 : 210} rot={12 + jit(c.t, 'b', 4)} /></Paper>
        {met && <Sparkles t={c.t} color={C.cream} pts={[[960, 400, 40, last], [820, 700, 26, last + 2], [1110, 690, 30, last + 4]]} />}
      </Cam><Lyric c={c} slot={s.slot} style="converge" x={960} y={220} maxW={1500} size={120} look={look} /></AbsoluteFill>);
    }
    case 'heartbeat': {
      const thump = 1 + 0.16 * eighth(c.a);
      let d = 'M0,560';
      for (let x = 0; x <= W; x += 20) {const k = (x / 160) % 1; d += ` L${x},${560 + (k > 0.4 && k < 0.5 ? -170 : k >= 0.5 && k < 0.58 ? 120 : 0)}`;}
      return (<AbsoluteFill><Rays cx={960} cy={540} color={C.scarlet} opacity={0.12} rot={c.t * 1.2} R={1300} n={20} />
        <Draw d={d} color={C.scarlet} width={10} p={prog(c.t, 0, c.dur * 0.9, Easing.linear)} />
        <Paper c={c} seed="hb"><Sketch name="st/heart" x={960} y={540} w={420} sx={thump} sy={thump} rot={jit(c.t, 'hb', 3)} t={c.t} start={0} draw={6} /></Paper>
        {bottom('pulse', 120)}</AbsoluteFill>);
    }
    case 'mandala': // an exclamation: giant hand-lettered word over a spinning mandala
      return (<AbsoluteFill><Rays cx={960} cy={540} color={C.scarlet} opacity={0.12} rot={c.t * 0.5} R={1300} n={32} />
        <Cam c={c} push={0.06}><Sketch name="mandala" x={960} y={540} w={900} rot={-c.t * 0.6} t={c.t} start={0} draw={12} ink={C.scarlet} />
          <Sparkles t={c.t} color={C.cream} pts={[[420, 260, 40, 4], [1500, 280, 34, 8], [380, 820, 28, 12], [1540, 820, 44, 16], [960, 120, 26, 24], [960, 980, 30, 30]]} />
          <Rain t={c.t} start={0} names={['st/marigold', 'st/petal', 'st/rose']} count={20} seed="cry" size={[50, 100]} speed={6} /></Cam>
        <Lyric c={c} slot={s.slot} style="giant" x={960} y={540} maxW={1700} size={300} rot={-4} look={{fg: C.scarlet, dark: C.ink, hi: C.scarlet, rom: C.mellow}} /></AbsoluteFill>);
    case 'lotusDew': {
      const grow = prog(c.t, last - 4, last + 4);
      return (<AbsoluteFill><Cam c={c} push={0.08} oy={45}>
        <Paper c={c} seed="lot"><Sketch name="lotus" x={960} y={620} w={760} t={c.t} start={0} draw={10} /></Paper>
        <svg width={W} height={H} style={{position: 'absolute'}}><g transform={`translate(1010 ${330 + grow * 30}) scale(${grow})`}>
          <path d="M0,-40 C14,-14 26,6 26,20 C26,36 14,46 0,46 C-14,46 -26,36 -26,20 C-26,6 -14,-14 0,-40Z" fill={C.riviera} stroke={C.ink} strokeWidth={4} opacity={0.92} />
          <ellipse cx={-8} cy={14} rx={6} ry={10} fill={C.cream} /></g></svg>
        <Sparkles t={c.t} color={C.cream} pts={[[1040, 300, 18, last + 2]]} />
      </Cam>{top('write')}</AbsoluteFill>);
    }
    case 'globe': { // the world spins and drifts away (words ride an arc around it)
      const away = prog(c.t, c.dur * 0.55, c.dur + 4, Easing.in(Easing.quad));
      return (<AbsoluteFill>
        <Sparkles t={c.t} color={C.cream} pts={Array.from({length: 14}, (_, i) => [random(`wx${i}`) * W, random(`wy${i}`) * H, 10 + random(`ws${i}`) * 16, i * 2] as [number, number, number, number])} />
        <AbsoluteFill style={{transform: `translate(${away * 520}px, ${-away * 300}px) scale(${1 - away * 0.85})`, transformOrigin: '960px 540px'}}>
          <Paper c={c} seed="gl"><Sketch name="globe" x={960} y={540} w={560} rot={c.t * 3} t={c.t} start={0} draw={8} /></Paper>
          <Lyric c={c} slot={s.slot} style="arc" x={960} y={540} maxW={1200} size={84} arcR={360} look={look} />
        </AbsoluteFill></AbsoluteFill>);
    }
    case 'shyStars': {
      const blush = 0.5 + 0.5 * Math.sin(c.t / 3);
      return (<AbsoluteFill><Cam c={c}>
        <Sparkles t={c.t} color={isDark(c.bg) ? C.marigold : C.scarlet} pts={Array.from({length: 12}, (_, i) => [200 + random(`sx${i}`) * 1520, 120 + random(`sy${i}`) * 820, 10 + random(`ss${i}`) * 14, i * 2] as [number, number, number, number])} />
        <Paper c={c} seed="ss"><Sketch name="shy_stars" x={960} y={560} w={1100} sy={1 + 0.04 * Math.sin(c.t / 2)} t={c.t} start={0} draw={10} /></Paper>
        <svg width={W} height={H} style={{position: 'absolute', mixBlendMode: 'multiply'}}>{c.t >= last && [[700, 600], [1240, 600]].map(([x, y], i) => <ellipse key={i} cx={x} cy={y} rx={60} ry={30} fill={C.hotPink} opacity={0.35 * blush} />)}</svg>
      </Cam>{top('twinkle')}</AbsoluteFill>);
    }
    case 'kintsugi': { // a wound is cut, gold balm paints over it, the heart is mended
      const slash = 'M520,700 C700,560 820,640 960,520 S1260,380 1420,330', healed = c.t >= last;
      return (<AbsoluteFill><Cam c={c}>
        {!healed && <Draw d={slash} color={C.scarlet} width={34} p={prog(c.t, (wf[0] ?? 0) - 2, (wf[0] ?? 0) + 4)} />}
        {!healed && <Draw d={slash} color={C.marigold} width={22} p={prog(c.t, wf[1] ?? wf[0] ?? 0, (wf[1] ?? wf[0] ?? 0) + 6)} />}
        {healed && <Paper c={c} seed="kin"><Sketch name="heart_kintsugi" x={960} y={500} w={560} t={c.t} start={last} draw={6} /></Paper>}
      </Cam><Lyric c={c} slot={s.slot} style="write" x={960} y={930} maxW={1500} size={110} look={look} /></AbsoluteFill>);
    }
    default: return null;
  }
};

// notes — sargam / alaap syllables: she twirls, then a new look card on each note (s.notes = [{t, dev, rom, card?}])
const KNotes: ShotFC = ({c, s}) => {
  const notes = (s.notes ?? []) as {t: number; dev: string; rom: string; card?: string}[];
  const cur = notes.reduce<{t: number; card?: string} | null>((p, n) => (c.t >= at(c, n.t) && n.card ? n : p), null);
  const card = cur?.card ? cardBy(cur.card) : undefined;
  const ph = ((c.a / FPS - BEAT0) / B) * Math.PI, sx = Math.sign(Math.cos(ph) || 1) * Math.max(0.35, Math.abs(Math.cos(ph)));
  const tw = TWIRL, w = 640, h = tw ? (w * tw.h) / tw.w : 0;
  const cols = [C.plum, C.cream, C.marigold, C.peach, C.plum, C.cream, C.marigold];
  return (
    <AbsoluteFill style={card ? {background: card.bg} : undefined}>
      {card ? <CardImg c={c} card={card} cf={c.t - at(c, cur!.t)} cx={960} /> : tw && (
        <><Rays cx={960} cy={700} color={C.rani} opacity={0.1} rot={c.f * 1.2} R={1400} n={30} />
          <Cam c={c}><svg width={W} height={H} style={{position: 'absolute'}}>
            {[0, 1, 2].map((k) => <ellipse key={k} cx={960} cy={890} rx={300 + k * 70} ry={60 + k * 20} fill="none" stroke={[C.rani, C.peacock, C.scarlet][k]} strokeWidth={8} strokeDasharray="160 120" strokeDashoffset={-c.f * (18 + k * 6)} strokeLinecap="round" />)}
          </svg><Paper c={c} seed="tw"><Art name={`char/${tw.file}`} x={960} y={H - h / 2 + 10} w={w} sx={sx} /></Paper></Cam></>
      )}
      {notes.map((n, i) => {
        const f = at(c, n.t);
        if (c.t < f) return null;
        const out = prog(c.t, f + 14, f + 20), col = cols[i % cols.length];
        return (
          <div key={i} style={{position: 'absolute', left: i % 2 ? 1500 : 420, top: i % 4 < 2 ? 330 : 700, transform: `translate(-50%,-50%) scale(${pop(c.t, f, 6) * (1 - out)}) rotate(${jit(c.t, n.dev + i, 6)}deg)`, textAlign: 'center'}}>
            <div style={{fontFamily: YATRA, fontSize: 240, color: col, WebkitTextStroke: `3px ${C.rani}`, paintOrder: 'stroke fill', textShadow: `7px 7px 0 ${C.rani}`, lineHeight: 1.15, ...BRUSH}}>{n.dev}</div>
            <div style={{fontFamily: KALAM, fontWeight: 700, fontSize: 54, color: col, textShadow: `2px 2px 0 ${C.rani}`}}>{n.rom}</div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

// end — her eyes open on the first word; s.flips = [{word, card}] snap new looks on later words; the film then folds shut
const KEnd: ShotFC = ({c, s}) => {
  const wf = wordsF(c, s.slot), hd = headOf(s.set);
  const flips = (s.flips ?? []) as {word: number; card: string}[];
  const cur = flips.reduce<{word: number; card: string} | null>((p, fl) => (wf[fl.word] !== undefined && c.t >= wf[fl.word] ? fl : p), null);
  const card = cur ? cardBy(cur.card) : undefined;
  const mood = moodAt(c.t, [[-99, 'closed'], [wf[0] ?? 0, 'half'], [(wf[0] ?? 0) + 2, 'front']]);
  return (
    <AbsoluteFill style={card ? {background: card.bg} : undefined}>
      {card ? <CardImg c={c} card={card} cf={c.t - wf[cur!.word]} /> : (
        <Cam c={c} push={0.1} ox={60} oy={30}><Zigs c={c} cx={hd.x} cy={hd.y} r={240} kick={beatK(c.a)} spin={-c.t * 0.3} /><Girl c={c} set={s.set} mood={mood} /></Cam>
      )}
      <Rain t={c.t} start={4} names={['st/marigold', 'st/petal', 'st/jasmine', 'st/rose']} count={20} seed="gend" size={[45, 95]} speed={4.5} />
      <Lyric c={card ? {...c, bg: card.bg} : c} slot={s.slot} style="soft" x={520} y={560} maxW={700} size={110} look={lookFor(card ? {...c, bg: card.bg} : c, false)} />
    </AbsoluteFill>
  );
};

const KINDS: Record<string, ShotFC> = {open: KOpen, character: KCharacter, eyes: KEyes, cards: KCards, prop: KProp, notes: KNotes, end: KEnd};

// ── transitions ──────────────────────────────────────────────────────────────────────
type Tr = 'cut' | 'iris' | 'blink' | 'slide' | 'zoom' | 'tear' | 'spin';
const TR_LEN = 8; // on ones, so they glide while drawings stay on twos
const Transition: React.FC<{kind: Tr; ox?: number; oy?: number; children: React.ReactNode}> = ({kind, ox = 960, oy = 540, children}) => {
  const f = useCurrentFrame();
  const p = clamp01((f + 1) / TR_LEN);
  if (p >= 1 || kind === 'cut') return <AbsoluteFill>{children}</AbsoluteFill>;
  const e = Easing.bezier(0.3, 0, 0.2, 1)(p);
  let style: React.CSSProperties = {};
  if (kind === 'iris') style = {clipPath: `path('${flower(ox, oy, 1300 * e, 12, 0.16)}')`};
  if (kind === 'blink') { const hh = 760 * e; style = {clipPath: `path('M-200,540 Q960,${540 - hh * 2} 2120,540 Q960,${540 + hh * 2} -200,540Z')`}; }
  if (kind === 'slide') style = {transform: `translateX(${(1 - e) * W}px) rotate(${(1 - e) * 5}deg)`, boxShadow: '-30px 0 0 rgba(42,8,18,0.35)'};
  if (kind === 'zoom') style = {transform: `scale(${0.05 + 0.95 * e}) rotate(${(1 - e) * -30}deg)`, transformOrigin: `${ox}px ${oy}px`, clipPath: `circle(${60 + 1300 * e}px at ${ox}px ${oy}px)`};
  if (kind === 'spin') style = {transform: `rotate(${(1 - e) * 200}deg) scale(${e})`};
  if (kind === 'tear') {
    let pts = '';
    const xEdge = -100 + e * (W + 200);
    for (let y = 0; y <= H; y += 60) pts += `${xEdge + (random(`tr${y}`) - 0.5) * 80}px ${y}px,`;
    style = {clipPath: `polygon(0 0, ${pts} 0 ${H}px)`};
  }
  return <AbsoluteFill style={style}>{children}</AbsoluteFill>;
};

// ── the stage: one frame that never cuts — block-print surround, scalloped field, dotted border ──
const STAGE: {outer: string; buti: string; field: string} = Object.assign({outer: C.peacock, buti: C.flossy, field: C.marigold}, (FILM as {stage?: object}).stage ?? {});
const INNER = cartouche(960, 540, FRAME.a - 22, FRAME.b - 22, 46, 12);
const Stage: React.FC = () => {
  const f = useCurrentFrame();
  const step = Math.floor(f / FPS / B); // the print shifts one notch per beat, like re-placed paper
  return (
    <AbsoluteFill style={{background: STAGE.outer}}>
      <svg width={W} height={H} style={{position: 'absolute'}}>
        <defs>
          <pattern id="stagebuti" width={120} height={120} patternUnits="userSpaceOnUse" patternTransform={`translate(${(step % 4) * 30},${(step % 4) * 15})`}>
            {[0, 90, 180, 270].map((r) => <ellipse key={r} cx={60} cy={47} rx={6} ry={13} fill={STAGE.buti} opacity={0.75} transform={`rotate(${r} 60 60)`} />)}
            <circle cx={60} cy={60} r={6} fill={C.marigold} />
            {[[0, 0], [120, 0], [0, 120], [120, 120]].map(([x, y]) => <circle key={`${x}${y}`} cx={x} cy={y} r={4} fill={C.peach} opacity={0.7} />)}
          </pattern>
        </defs>
        <rect width={W} height={H} fill="url(#stagebuti)" />
        <path d={cartouche(960, 540, FRAME.a, FRAME.b, 46, 16)} fill={STAGE.field} />
      </svg>
      <AbsoluteFill style={{clipPath: `path('${INNER}')`, mixBlendMode: 'multiply', opacity: 0.1}}><Art name="mandala" x={960} y={540} w={1500} rot={f * 0.05} /></AbsoluteFill>
    </AbsoluteFill>
  );
};
const FrameEdge: React.FC = () => {
  const k = beatK(useCurrentFrame(), 0.25);
  return (
    <svg width={W} height={H} style={{position: 'absolute', left: 0, top: 0}}>
      <path d={cartouche(960, 540, FRAME.a, FRAME.b, 46, 16)} fill="none" stroke={C.cream} strokeWidth={12 + 4 * k} />
      <path d={cartouche(960, 540, FRAME.a - 18, FRAME.b - 18, 46, 13)} fill="none" stroke={C.rani} strokeWidth={6} strokeDasharray="0 18" strokeLinecap="round" />
      <path d={cartouche(960, 540, FRAME.a + 16, FRAME.b + 16, 46, 18)} fill="none" stroke={C.velvet} strokeWidth={3} opacity={0.6} />
    </svg>
  );
};
// the last ~0.85s: the whole stage folds shut like a flower
const EndClose: React.FC<{children: React.ReactNode}> = ({children}) => {
  const f = useCurrentFrame();
  const ec = (FILM as {endClose?: {x: number; y: number}}).endClose ?? {x: 1250, y: 440};
  const p = prog(f, (DURATION_S - 0.87) * FPS, (DURATION_S - 0.07) * FPS, Easing.in(Easing.cubic));
  return <AbsoluteFill style={{clipPath: p > 0 ? `path('${flower(ec.x, ec.y, 1600 * (1 - p) + 1, 14, 0.14)}')` : undefined}}>{children}</AbsoluteFill>;
};

// ── composition ──────────────────────────────────────────────────────────────────────
const SHOTS = (FILM.shots as Shot[]).slice().sort((a, b) => a.t - b.t);
const ShotHost: React.FC<{s: Shot; s1: number; from: number}> = ({s, s1, from}) => {
  const fr = useCurrentFrame();
  const local = fr - (from === 0 ? 0 : LEAD);
  const t = local - (((local % 2) + 2) % 2);
  const bg: string = (s.bg && (BG[s.bg] ?? s.bg)) || STAGE.field;
  const K = KINDS[s.kind];
  return <AbsoluteFill style={{background: bg}}>{K && <K c={{t, f: local, a: from + fr, s0: s.t, dur: (s1 - s.t) * FPS, bg}} s={s} />}</AbsoluteFill>;
};
const usePreload = () => {
  const [h] = useState(() => delayRender('preload art'));
  useEffect(() => {
    const srcs = [...Object.keys(ART).map((n) => staticFile(`art/${n}.png`)), ...PLATES.map((n) => staticFile(`art/${n}.jpg`)),
      ...(CU?.frames ?? []).map((k) => staticFile(`art/char/cu_${k}.jpg`)), ...CARDS.flatMap((k) => [staticFile(`art/cards/${k.name}.jpg`), staticFile(`art/cards/${k.name}_closed.jpg`)])];
    Promise.all(srcs.map((s) => {const i = new Image(); i.src = s; return i.decode().catch(() => undefined);})).then(() => continueRender(h));
  }, [h]);
};
export const LyricFilm: React.FC = () => {
  usePreload();
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{background: C.velvet}}>
      <Defs />
      <EndClose>
        <AbsoluteFill style={{filter: boilUrl(frame)}}>
          <Stage />
          <AbsoluteFill style={{clipPath: `path('${INNER}')`}}>
            {SHOTS.map((s, i) => {
              const s1 = i + 1 < SHOTS.length ? SHOTS[i + 1].t : DURATION_S;
              const from = Math.max(0, Math.round(s.t * FPS) - (i ? LEAD : 0));
              const to = i + 1 < SHOTS.length ? Math.round(s1 * FPS) + TR_LEN : DURATION;
              return (
                <Sequence key={i} from={from} durationInFrames={Math.max(1, to - from)} name={`${i} ${s.kind}${s.prop ? ':' + s.prop : ''}${s.mood ? ':' + s.mood : ''}`}>
                  <Transition kind={(s.transition ?? (i ? 'iris' : 'cut')) as Tr} ox={s.ox} oy={s.oy}><ShotHost s={s} s1={s1} from={from} /></Transition>
                </Sequence>
              );
            })}
          </AbsoluteFill>
          <FrameEdge />
        </AbsoluteFill>
      </EndClose>
      <Grain />
      {FILM.audio && <Audio src={staticFile(FILM.audio)} />}
    </AbsoluteFill>
  );
};
