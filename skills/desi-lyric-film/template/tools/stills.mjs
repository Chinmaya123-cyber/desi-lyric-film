// node tools/stills.mjs out_dir scale frame1 frame2 ...   (bundles once, renders many stills)
import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition} from '@remotion/renderer';
import fs from 'node:fs';
import path from 'node:path';
const [out, scale, ...frames] = process.argv.slice(2);
fs.mkdirSync(out, {recursive: true});
const CH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const browserExecutable = fs.existsSync(CH) ? CH : null;
const serveUrl = await bundle({entryPoint: path.resolve('src/index.ts')});
const composition = await selectComposition({serveUrl, id: process.env.COMP || 'LyricFilm', browserExecutable});
for (const f of frames) {
  try { await renderStill({serveUrl, composition, frame: Number(f), output: `${out}/f${String(f).padStart(4, '0')}.jpg`, imageFormat: 'jpeg', scale: Number(scale), browserExecutable, chromiumOptions: {gl: 'angle'}}); } catch (e) { console.log("\nERR frame", f, String(e.message).slice(0, 400)); }
  process.stdout.write(f + ' ');
}
